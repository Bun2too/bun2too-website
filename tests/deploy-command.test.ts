import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("workflow publish arguments pass the pinned Netlify CLI validation without deploying", async () => {
  const cli = resolve("node_modules/netlify-cli");
  const { Command } = createRequire(resolve(cli, "package.json"))("commander");
  // addExamples is the CLI's help-formatting extension, not option validation.
  class Program extends Command {
    createCommand(name: string) {
      return new Program(name);
    }
    addExamples() {
      return this;
    }
  }
  const deployURL = pathToFileURL(
    resolve(cli, "dist/commands/deploy/deploy.js"),
  ).href;
  const telemetryURL = pathToFileURL(
    resolve(cli, "dist/utils/telemetry/report-error.js"),
  ).href;
  const calls: Record<string, unknown>[] = [];
  const state = globalThis as typeof globalThis & {
    __bun2tooDeployOptions?: (options: Record<string, unknown>) => void;
  };
  state.__bun2tooDeployOptions = (options) => {
    calls.push(options);
  };
  // Exercise vendor option parsing AND action validation. Replace only the
  // deployment executor and error telemetry, so no account, network, upload,
  // global CLI configuration, or external state can be touched by this test.
  const hook = registerHooks({
    load(url, context, next) {
      if (url === deployURL)
        return {
          format: "module",
          shortCircuit: true,
          source:
            "export const deploy = async options => globalThis.__bun2tooDeployOptions(options);",
        };
      if (url === telemetryURL)
        return {
          format: "module",
          shortCircuit: true,
          source: "export const reportError = async () => {};",
        };
      return next(url, context);
    },
  });
  try {
    await import(deployURL); // Ensure the stub is loaded before any action runs.
    const { createDeployCommand } = await import(
      pathToFileURL(resolve(cli, "dist/commands/deploy/index.js")).href
    );
    const workflow = readFileSync(".github/workflows/ci-cd.yml", "utf8");
    const line = workflow
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("npx netlify deploy "));
    assert.ok(line, "workflow must contain the publish command");
    // This command has simple quoted values and a stdout redirect. The shell
    // is never executed; pass only its CLI arguments to the real parser.
    const args = line
      .slice("npx netlify ".length)
      .split(" > ")[0]
      .match(/"[^"]*"|\S+/g)!
      .map((token) => token.replace(/^"|"$/g, ""));
    const program = new Program();
    createDeployCommand(program);
    await program.parseAsync(args, { from: "user" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].build, false);
    assert.equal(calls[0].prod, true);
    assert.equal(calls[0].context, undefined);
    assert.equal(calls[0].json, true);

    const invalid = new Program();
    createDeployCommand(invalid);
    await assert.rejects(
      invalid.parseAsync(
        ["deploy", "--no-build", "--prod", "--context", "production"],
        { from: "user" },
      ),
      /--context flag is only available when using the --build flag/,
    );
    assert.equal(calls.length, 1, "invalid flags must not reach the executor");
  } finally {
    hook.deregister();
    delete state.__bun2tooDeployOptions;
  }
});
