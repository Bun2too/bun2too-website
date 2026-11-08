import { test } from "node:test";
import assert from "node:assert/strict";
import { scanContent, forbiddenPath } from "../scripts/check-public-repo.mjs";
test("publication guard redacts findings and detects credentials and local-only files", () => {
  const key = ["gh", "p_", "a".repeat(36)].join("");
  assert.equal(scanContent(key)[0].type, "github-token");
  const value = "fixture-private-value";
  assert.equal(
    scanContent(value, [["EXAMPLE_KEY", value]])[0].type,
    "local-config:EXAMPLE_KEY",
  );
  const local = ["a", "private-value-known-only-locally"].join("");
  const result = scanContent(local, [["LOCAL_SETTING", local]]);
  assert.equal(result[0].type, "local-config:LOCAL_SETTING");
  assert.equal(JSON.stringify(result).includes(local), false);
  for (const name of [
    ".env.local",
    "nested/.env.production",
    ".netlify/state.json",
    "credentials",
    "private.key",
    "test-results/session.zip",
  ])
    assert.equal(forbiddenPath(name), true);
  for (const name of [
    ".env.example",
    ".agents/skills/example/SKILL.md",
    "docs/security.md",
  ])
    assert.equal(forbiddenPath(name), false);
});
test("publication guard accepts reserved fixture identities and public workflow key names", () => {
  assert.deepEqual(
    scanContent(
      "NEXT_PUBLIC_AUTH0_CLIENT_ID: ${{ vars.NEXT_PUBLIC_AUTH0_CLIENT_ID }}",
    ),
    [],
  );
  assert.deepEqual(
    scanContent("https://tenant.example.auth0.com GTM-TEST123 G-TEST123456"),
    [],
  );
});
