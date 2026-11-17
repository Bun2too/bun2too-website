import test from "node:test";
import assert from "node:assert/strict";
import { supportAdapter } from "../evals/support/adapter.mjs";

test("evaluation adapter exercises real storage, consent/session guards and observed route order without external side effects", async () => {
  const env = { ...process.env },
    original = globalThis.fetch;
  Object.assign(process.env, {
    OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true",
    OPENWEBUI_BASE_URL: "https://provider.example.invalid",
    OPENWEBUI_API_KEY: "fixture-key",
    OPENWEBUI_MODEL_ID: "fixture-model",
    OPENWEBUI_KNOWLEDGE_ID: "fixture-knowledge",
  });
  let sends = 0,
    denyCandidate = false;
  globalThis.fetch = async (input, options) => {
    if (new URL(String(input)).hostname === "provider.example.invalid") {
      sends++;
      if (denyCandidate)
        return Response.json(
          { detail: "fixture-private-provider-error" },
          { status: 401 },
        );
      return Response.json({
        choices: [
          {
            message: {
              content:
                "Bun2Too helps businesses with AI engineering and customer technology.",
            },
          },
        ],
      });
    }
    return original(input, options);
  };
  let adapter;
  try {
    adapter = await supportAdapter();
    for (const suite of ["component", "trajectory"]) {
      const result = await adapter.runCase(
        { question: "What services does Bun2Too offer?" },
        suite,
      );
      assert.deepEqual(
        result.checks.filter((check) => !check.passed),
        [],
      );
      assert.equal(result.calls.length, 1);
      assert.match(result.calls[0].output, /AI engineering/);
    }
    const before = sends;
    for (const guard of [
      { noConsent: true },
      { missingSession: true },
      { invalidOrigin: true },
    ]) {
      const result = await adapter.runCase(
        { question: "Public fixture", ...guard },
        "trajectory",
      );
      assert.deepEqual(
        result.checks.filter((check) => !check.passed),
        [],
      );
      assert.equal(result.calls.length, 0);
    }
    assert.equal(sends, before);
    denyCandidate = true;
    const denied = await adapter.runCase(
      { question: "Public fixture" },
      "component",
    );
    assert.equal(denied.calls[0].httpStatus, 401);
    assert.ok(
      denied.checks.some(
        (check) => check.name === "candidate-http-401" && !check.passed,
      ),
    );
    assert.ok(
      !JSON.stringify(denied).includes("fixture-private-provider-error"),
    );
  } finally {
    await adapter?.close();
    globalThis.fetch = original;
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});
