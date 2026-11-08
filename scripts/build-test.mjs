import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const fixtures = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/public-env.json", import.meta.url),
    "utf8",
  ),
);
// Test settings never enter the release build. Override ignored local values too.
const env = {
  ...process.env,
  ...fixtures,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  INSIGHTS_API_ORIGIN: "",
};
const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  { env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
