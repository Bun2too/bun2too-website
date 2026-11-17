import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, writeFile, rename, unlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

test(
  "development reloads replaced/deleted env files, preserves shell precedence, and stops only its own children",
  { timeout: 15000 },
  async () => {
    const { startDevelopment } = await import("../scripts/dev.mjs");
    const cwd = await mkdtemp(join(tmpdir(), "b2t-dev-fixture-"));
    const children: ChildProcess[] = [];
    const messages: Array<Record<string, string>> = [];
    const waiters: Array<() => void> = [];
    const waitFor = async (count: number) => {
      while (messages.length < count)
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "Development runtime did not reload the fixture environment",
                ),
              ),
            3000,
          );
          waiters.push(() => {
            clearTimeout(timeout);
            resolve();
          });
        });
    };
    const sentinel = spawn(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      { stdio: "ignore" },
    );
    let runner: Awaited<ReturnType<typeof startDevelopment>> | undefined;
    try {
      await writeFile(
        join(cwd, ".env.contentful.local"),
        "FIXTURE_TOKEN=cms-default\nFIXTURE_ENABLED=false\n",
      );
      await writeFile(
        join(cwd, ".env.local"),
        "FIXTURE_TOKEN=old-value\nFIXTURE_ENABLED=true\nFIXTURE_SHELL=file-value\nFIXTURE_ONLY_LOCAL=present\n",
      );
      runner = await startDevelopment({
        cwd,
        debounceMs: 20,
        pollIntervalMs: 20,
        inheritedEnv: { ...process.env, FIXTURE_SHELL: "shell-value" },
        log: () => {},
        launch: (env: NodeJS.ProcessEnv) => {
          const child = spawn(
            process.execPath,
            [
              "-e",
              `process.send({token:process.env.FIXTURE_TOKEN,enabled:process.env.FIXTURE_ENABLED,shell:process.env.FIXTURE_SHELL,onlyLocal:process.env.FIXTURE_ONLY_LOCAL});setInterval(()=>{},1000)`,
            ],
            {
              env,
              detached: process.platform !== "win32",
              stdio: ["ignore", "ignore", "ignore", "ipc"],
            },
          );
          children.push(child);
          child.on("message", (message) => {
            messages.push(message as Record<string, string>);
            for (const waiter of waiters.splice(0)) waiter();
          });
          return child;
        },
      });
      await waitFor(1);
      assert.deepEqual(messages[0], {
        token: "old-value",
        enabled: "true",
        shell: "shell-value",
        onlyLocal: "present",
      });
      await writeFile(
        join(cwd, ".env.saved"),
        "FIXTURE_TOKEN=rotated-value\nFIXTURE_ENABLED=false\nFIXTURE_SHELL=new-file-value\n",
      );
      await rename(join(cwd, ".env.saved"), join(cwd, ".env.local"));
      await waitFor(2);
      assert.deepEqual(messages[1], {
        token: "rotated-value",
        enabled: "false",
        shell: "shell-value",
      });
      assert.notEqual(children[0].exitCode ?? children[0].signalCode, null);
      await unlink(join(cwd, ".env.local"));
      await waitFor(3);
      assert.deepEqual(messages[2], {
        token: "cms-default",
        enabled: "false",
        shell: "shell-value",
      });
      await runner.close();
      assert.equal(await runner.done, 0);
      assert.equal(sentinel.exitCode, null);
      assert.equal(sentinel.signalCode, null);
      assert.ok(
        children.every(
          (child) => child.exitCode !== null || child.signalCode !== null,
        ),
      );
    } finally {
      await runner?.close();
      sentinel.kill();
      await rm(cwd, { recursive: true, force: true });
    }
  },
);

test(
  "a failed runtime launch exits cleanly without leaking environment values",
  { timeout: 5000 },
  async () => {
    const { startDevelopment } = await import("../scripts/dev.mjs");
    const cwd = await mkdtemp(join(tmpdir(), "b2t-dev-failure-"));
    const logs: string[] = [];
    try {
      const runner = await startDevelopment({
        cwd,
        inheritedEnv: { FIXTURE_TOKEN: "fixture-private-value" },
        log: (value: string) => logs.push(value),
        launch: () => spawn(join(cwd, "missing-executable")),
      });
      assert.equal(await runner.done, 1);
      assert.doesNotMatch(logs.join("\n"), /fixture-private-value/);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
);

test(
  "repeated interrupts wait for graceful shutdown instead of orphaning a runtime",
  { timeout: 5000 },
  async () => {
    const cwd = await mkdtemp(join(tmpdir(), "b2t-dev-signals-"));
    const moduleUrl = pathToFileURL(resolve("scripts/dev.mjs")).href;
    const worker =
      "process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),150));process.send('ready');setInterval(()=>{},1000)";
    const source = `
    import {spawn} from 'node:child_process';
    import {startDevelopment,handleDevelopmentSignals} from ${JSON.stringify(moduleUrl)};
    const runner=await startDevelopment({cwd:${JSON.stringify(cwd)},log:()=>{},launch:(env)=>{
      const child=spawn(process.execPath,['-e',${JSON.stringify(worker)}],{env,detached:process.platform!=='win32',stdio:['ignore','ignore','ignore','ipc']});
      child.once('message',()=>process.send({runtimePid:child.pid}));return child;
    }});
    const remove=handleDevelopmentSignals(runner);
    process.exitCode=await runner.done;remove();process.disconnect();
  `;
    const wrapper = spawn(
      process.execPath,
      ["--input-type=module", "-e", source],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    const exited = once(wrapper, "exit");
    let runtimePid: number | undefined;
    let timer: NodeJS.Timeout | undefined;
    try {
      const [message] = await Promise.race([
        once(wrapper, "message"),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Fixture runtime did not start")),
            3000,
          );
        }),
      ]);
      clearTimeout(timer);
      runtimePid = message.runtimePid;
      wrapper.kill("SIGINT");
      await new Promise((resolve) => setTimeout(resolve, 10));
      wrapper.kill("SIGINT");
      const [code, signal] = await exited;
      assert.equal(code, 0);
      assert.equal(signal, null);
      assert.throws(
        () => process.kill(runtimePid!, 0),
        (error: NodeJS.ErrnoException) => error.code === "ESRCH",
      );
    } finally {
      clearTimeout(timer);
      if (wrapper.exitCode === null && wrapper.signalCode === null)
        wrapper.kill("SIGKILL");
      if (runtimePid) {
        try {
          process.kill(
            process.platform === "win32" ? runtimePid : -runtimePid,
            "SIGKILL",
          );
        } catch {}
      }
      await rm(cwd, { recursive: true, force: true });
    }
  },
);
