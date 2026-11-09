import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditFailure, downloadArchive, scan } from "../scripts/gitleaks.mjs";

const quiet = { wait: async () => {}, warn: () => {} };

test("release download retries transient HTTP failures and still rejects unverified bytes", async () => {
  let calls = 0;
  const urls: string[] = [];
  await assert.rejects(
    downloadArchive("linux-x64", {
      ...quiet,
      fetcher: async (url: string) => {
        urls.push(url);
        return ++calls === 1
          ? new Response("private upstream response", { status: 504 })
          : new Response("unverified executable");
      },
    }),
    /SHA-256 mismatch/,
  );
  assert.equal(calls, 2);
  assert.equal(new URL(urls[0]).hostname, "github.com");
  assert.equal(new URL(urls[1]).hostname, "api.github.com");
});

test("release retries are bounded and diagnostics exclude network error messages", async () => {
  let calls = 0;
  const warnings: string[] = [];
  await assert.rejects(
    downloadArchive("linux-x64", {
      ...quiet,
      warn: (message: string) => warnings.push(message),
      fetcher: async () => {
        calls++;
        throw Object.assign(new Error("private network details"), {
          cause: { code: "ECONNRESET" },
        });
      },
    }),
    (error: Error) => {
      const message = auditFailure(error, "release download and verification");
      assert.match(message, /ECONNRESET.*after 3 attempts/);
      assert.doesNotMatch(message, /private network details/);
      return true;
    },
  );
  assert.equal(calls, 3);
  assert.equal(warnings.length, 2);
  assert.ok(
    warnings.every((message) => !message.includes("private network details")),
  );
});

test("permanent HTTP errors fail immediately without printing response bodies", async () => {
  let calls = 0;
  await assert.rejects(
    downloadArchive("linux-x64", {
      ...quiet,
      fetcher: async () => {
        calls++;
        return new Response("private upstream response", { status: 404 });
      },
    }),
    (error: Error) => {
      assert.match(error.message, /HTTP 404/);
      assert.doesNotMatch(error.message, /private upstream response/);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("unsupported platforms fail before attempting any download", async () => {
  await assert.rejects(
    downloadArchive("unsupported", {
      fetcher: () => assert.fail("must not fetch"),
    }),
    /supported platforms/,
  );
});

test("scanner execution and invalid report failures never echo raw subprocess output", () => {
  const raw = "private subprocess content";
  for (const result of [
    { status: null, error: Object.assign(new Error(raw), { code: "ENOENT" }) },
    { status: 2, stderr: raw },
    { status: 1, stderr: raw },
  ]) {
    assert.throws(
      () =>
        scan("scanner", [], "history", "missing-report", "snapshot", {
          spawn: () => result,
        }),
      (error: Error) => {
        const message = auditFailure(error, "history scan");
        assert.match(message, /history scan/);
        assert.doesNotMatch(message, /private subprocess content/);
        return true;
      },
    );
  }
  assert.doesNotMatch(
    auditFailure(new Error(raw), "archive extraction"),
    /private subprocess content/,
  );
});

test("findings fail the scan while logging only their location and rule", () => {
  const directory = mkdtempSync(join(tmpdir(), "gitleaks-test-"));
  try {
    const report = join(directory, "report.json");
    writeFileSync(
      report,
      JSON.stringify([
        {
          File: "snapshot/example.txt",
          StartLine: 3,
          RuleID: "fixture-rule",
          Secret: "private finding content",
          Match: "private finding content",
        },
      ]),
    );
    const messages: string[] = [];
    const options = {
      spawn: () => ({ status: 1 }),
      log: {
        error: (message: string) => messages.push(message),
        log: (message: string) => messages.push(message),
      },
    };
    assert.equal(
      scan("scanner", [], "candidate", report, "snapshot", options),
      false,
    );
    assert.equal(messages.length, 1);
    assert.match(messages[0], /example.txt.*3.*fixture-rule.*redacted/);
    assert.doesNotMatch(messages[0], /private finding content/);
    assert.equal(
      scan("scanner", [], "history", report, "snapshot", {
        ...options,
        spawn: () => ({ status: 0 }),
      }),
      true,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
