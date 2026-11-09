import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyBrowserConfig } from "../scripts/check-browser-config.mjs";
import fixtures from "./fixtures/public-env.json";
test("a release cannot ship missing or stale browser provider settings", () => {
  const dir = mkdtempSync(join(tmpdir(), "browser-config-test-"));
  try {
    mkdirSync(join(dir, "static"));
    const env = {
      ...fixtures,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture-widget",
    };
    writeFileSync(join(dir, "static", "fixture.js"), JSON.stringify(env));
    assert.doesNotThrow(() => verifyBrowserConfig(dir, env));
    assert.throws(
      () =>
        verifyBrowserConfig(dir, {
          ...env,
          NEXT_PUBLIC_AUTH0_CLIENT_ID: "private-stale-id",
        }),
      (error: Error) => {
        assert.match(error.message, /NEXT_PUBLIC_AUTH0_CLIENT_ID/);
        assert.doesNotMatch(error.message, /private-stale-id/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
