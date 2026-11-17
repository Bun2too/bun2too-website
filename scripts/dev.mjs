import { spawn } from "node:child_process";
import { watchFile, unwatchFile } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const loadedFiles = [".env.contentful.local", ".env.local"];
const watchedFiles = new Set([
  ...loadedFiles,
  ".env",
  ".env.development",
  ".env.development.local",
]);

async function readEnvironment(cwd, inherited) {
  let values = {};
  for (const file of loadedFiles) {
    let source = "";
    try {
      source = await readFile(resolve(cwd, file), "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    values = { ...values, ...parseEnv(source) };
  }
  // Keep the original shell environment, not a previous child's loaded values.
  return { ...values, ...inherited };
}

function launchRuntime(env, cwd, args) {
  return spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/netlify-cli/bin/run.js", import.meta.url),
      ),
      "dev",
      "--offline",
      "--no-open",
      "--geo=mock",
      "--port",
      "3000",
      "--target-port",
      "3001",
      "--command",
      "npx next dev --webpack --port 3001",
      ...args,
    ],
    { env, cwd, stdio: "inherit", detached: process.platform !== "win32" },
  );
}

export async function startDevelopment({
  cwd = process.cwd(),
  args = [],
  inheritedEnv = process.env,
  launch = launchRuntime,
  log = console.info,
  debounceMs = 250,
  pollIntervalMs = 500,
} = {}) {
  const inherited = { ...inheritedEnv };
  let current;
  let closed = false;
  let debounce;
  let queue = Promise.resolve();
  let shutdown;
  const expectedStops = new WeakSet();
  let finish;
  const done = new Promise((resolveDone) => {
    finish = resolveDone;
  });

  async function stopCurrent() {
    const child = current;
    current = undefined;
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null)
      return;
    expectedStops.add(child);
    const exited = new Promise((resolveExit) =>
      child.once("exit", resolveExit),
    );
    const signal = (name) => {
      try {
        if (process.platform === "win32") child.kill(name);
        else process.kill(-child.pid, name);
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    };
    signal("SIGTERM");
    const force = setTimeout(() => signal("SIGKILL"), 5000);
    force.unref();
    try {
      await exited;
    } finally {
      clearTimeout(force);
    }
  }

  async function close(code = 0) {
    if (!shutdown) {
      closed = true;
      clearTimeout(debounce);
      for (const stopWatching of watchers) stopWatching();
      shutdown = (async () => {
        await queue;
        await stopCurrent();
        finish(code);
      })();
    }
    return shutdown;
  }

  async function start() {
    const env = await readEnvironment(cwd, inherited);
    if (closed) return;
    const child = launch(env, cwd, args);
    current = child;
    child.once("error", () => {
      log(
        "Development runtime could not start. Configuration values withheld.",
      );
      void close(1);
    });
    child.once("exit", (code) => {
      if (!expectedStops.has(child) && !closed) void close(code ?? 1);
    });
  }

  const changed = () => {
    if (closed) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      queue = queue
        .then(async () => {
          if (closed) return;
          log(
            "Local environment file changed; restarting the development runtime with fresh settings.",
          );
          await stopCurrent();
          await start();
        })
        .catch(() => {
          log(
            "Could not reload the local environment. Configuration values withheld.",
          );
          void close(1);
        });
    }, debounceMs);
  };
  // Poll only these few files: works across atomic editor saves, missing files,
  // containers and platforms where native filesystem watch events are limited.
  const watchers = [...watchedFiles].map((file) => {
    const path = resolve(cwd, file);
    const listener = (current, previous) => {
      if (
        current.mtimeMs !== previous.mtimeMs ||
        current.size !== previous.size ||
        current.ino !== previous.ino
      )
        changed();
    };
    watchFile(path, { interval: pollIntervalMs }, listener);
    return () => unwatchFile(path, listener);
  });
  try {
    await start();
  } catch (error) {
    await close(1);
    throw error;
  }
  return { close, done };
}

export function handleDevelopmentSignals(development) {
  const shutdown = () => {
    void development.close();
  };
  // npm can forward a second interrupt while shutdown is still in progress.
  // Keep handling it until all owned children have exited.
  for (const name of ["SIGINT", "SIGTERM"]) process.on(name, shutdown);
  return () => {
    for (const name of ["SIGINT", "SIGTERM"]) process.off(name, shutdown);
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const development = await startDevelopment({ args: process.argv.slice(2) });
    const removeSignals = handleDevelopmentSignals(development);
    process.exitCode = await development.done;
    removeSignals();
  } catch {
    console.error(
      "Development startup failed. Check local environment files and available ports. Values withheld.",
    );
    process.exitCode = 1;
  }
}
