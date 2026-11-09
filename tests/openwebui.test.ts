import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerQuestion,
  parseQuestion,
  publicSupportConfig,
} from "../src/lib/openwebui";
import { POST } from "../src/app/api/support/chat/route";
const env = {
  OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true",
  OPENWEBUI_BASE_URL: "https://assistant.example.invalid",
  OPENWEBUI_API_KEY: "fixture-service-credential",
  OPENWEBUI_MODEL_ID: "fixture-support-model",
  OPENWEBUI_KNOWLEDGE_ID: "fixture-public-knowledge",
};
test("AI requires explicit enablement and an approved fixed model/knowledge configuration", () => {
  assert.equal(publicSupportConfig({}), null);
  assert.equal(
    publicSupportConfig({ ...env, OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "false" }),
    null,
  );
  assert.equal(
    publicSupportConfig({ ...env, OPENWEBUI_KNOWLEDGE_ID: "" }),
    null,
  );
  assert.equal(
    publicSupportConfig({
      ...env,
      OPENWEBUI_BASE_URL: "http://example.invalid",
    }),
    null,
  );
  assert.ok(publicSupportConfig(env));
  assert.throws(() => parseQuestion({ question: "Hello", consent: false }));
  assert.throws(() =>
    parseQuestion({ question: "a".repeat(1501), consent: true }),
  );
});
test("AI fixes model and knowledge server-side and returns only public answer text", async () => {
  const result = await answerQuestion(
    "How do I sign in?",
    async (url, options) => {
      assert.equal(
        url,
        "https://assistant.example.invalid/api/chat/completions",
      );
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, env.OPENWEBUI_MODEL_ID);
      assert.deepEqual(body.files, [
        { type: "collection", id: env.OPENWEBUI_KNOWLEDGE_ID },
      ]);
      assert.deepEqual(body.tool_ids, []);
      assert.equal(body.stream, false);
      assert.equal(body.messages.length, 2);
      assert.equal(options?.redirect, "error");
      return Response.json({
        choices: [
          {
            message: {
              content:
                "<think>internal reasoning</think>Read https://bun2too.com/support and https://private.example.invalid/admin",
            },
          },
        ],
        sources: [{ private: "internal-document" }],
        id: "private-session",
      });
    },
    env,
  );
  assert.match(result.answer, /https:\/\/bun2too.com\/support/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /internal reasoning|private.example|internal-document|private-session/,
  );
  assert.deepEqual(Object.keys(result), ["answer"]);
});
test("AI provider errors, redirects, oversized bodies and private settings never reach visitors", async () => {
  const previous = console.error;
  const logs: unknown[] = [];
  console.error = (...args) => logs.push(args);
  try {
    for (const response of [
      new Response("private error details", { status: 403 }),
      Response.json({
        choices: [{ message: { content: env.OPENWEBUI_API_KEY } }],
      }),
      new Response("a".repeat(256001)),
    ])
      await assert.rejects(
        answerQuestion("Help", async () => response, env),
        (error: Error) => {
          assert.doesNotMatch(
            error.message,
            /private error details|fixture-service-credential/,
          );
          return true;
        },
      );
    assert.doesNotMatch(
      JSON.stringify(logs),
      /private error details|fixture-service-credential/,
    );
  } finally {
    console.error = previous;
  }
});
test("chat validates origin and explicit consent before accessing storage or provider", async () => {
  const make = (origin: string, body: unknown) =>
    new Request("https://bun2too.com/api/support/chat", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await POST(
        make("https://other.example", { consent: true, question: "Help" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await POST(
        make("https://bun2too.com", { consent: false, question: "Help" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await POST(make("https://bun2too.com", { consent: true, question: "" })))
      .status,
    400,
  );
});
