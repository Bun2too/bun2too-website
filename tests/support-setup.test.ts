import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

test("local support setup preserves settings and signing keys without weak defaults", async () => {
  const { setupLocalSupport } =
    await import("../scripts/setup-local-support.mjs");
  const dir = await mkdtemp(join(tmpdir(), "bun2too-support-"));
  const file = join(dir, ".env.local");
  try {
    const original =
      '# Keep this comment\nOTHER_SETTING="unchanged"\nSUPPORT_SESSION_SECRET=';
    await writeFile(file, original);
    assert.equal(await setupLocalSupport(file), true);
    const first = await readFile(file, "utf8");
    assert.ok(first.startsWith(original));
    assert.equal(parseEnv(first).OTHER_SETTING, "unchanged");
    assert.match(parseEnv(first).SUPPORT_SESSION_SECRET, /^[a-f0-9]{64}$/);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal(await setupLocalSupport(file), false);
    assert.equal(await readFile(file, "utf8"), first);
    await writeFile(file, "SUPPORT_SESSION_SECRET=short\n");
    await assert.rejects(setupLocalSupport(file), /too short/);
    assert.equal(
      await readFile(file, "utf8"),
      "SUPPORT_SESSION_SECRET=short\n",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
