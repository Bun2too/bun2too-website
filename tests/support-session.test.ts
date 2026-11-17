import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../src/app/api/support/session/route";
import { SUPPORT_COOKIE, visitor } from "../src/lib/support";

test("session configuration fails closed, while an unsigned unrelated cookie has no effect", async () => {
  const keys = ["SUPPORT_SESSION_SECRET", "NETLIFY_BLOBS_CONTEXT"];
  const previous = keys.map((key) => process.env[key]);
  const oldLog = console.error;
  const logs: unknown[][] = [];
  console.error = (...args) => logs.push(args);
  for (const key of keys) delete process.env[key];
  const request = () =>
    new Request("http://localhost:3000/api/support/session", {
      headers: { Cookie: "token=unrelated-application-cookie" },
    });
  try {
    for (const secret of [undefined, "too-short"]) {
      if (secret) process.env.SUPPORT_SESSION_SECRET = secret;
      const response = await GET(request());
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match((await response.json()).error, /currently unavailable/);
    }
    assert.deepEqual(logs, [
      [
        "Support configuration unavailable",
        { setting: "SUPPORT_SESSION_SECRET", reason: "missing" },
      ],
      [
        "Support configuration unavailable",
        { setting: "SUPPORT_SESSION_SECRET", reason: "too-short" },
      ],
    ]);
    const secret =
      "isolated-test-session-signing-secret-at-least-32-characters";
    process.env.SUPPORT_SESSION_SECRET = secret;
    const response = await GET(request());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.inquiries, false);
    assert.equal(body.chat, false);
    assert.ok(body.inquiryUnavailableReasons.includes("storage"));
    assert.equal(response.headers.get("cache-control"), "no-store");
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=strict/i);
    assert.doesNotMatch(cookie, /; Secure/i);
    const identity = visitor(
      new Request(request(), { headers: { Cookie: cookie.split(";")[0] } }),
      secret,
    );
    assert.equal(identity.fresh, false);
    const follow = await GET(
      new Request(request(), {
        headers: { Cookie: `${SUPPORT_COOKIE}=${identity.value}` },
      }),
    );
    assert.equal(follow.status, 200);
    assert.equal(follow.headers.get("set-cookie"), null);
  } finally {
    console.error = oldLog;
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test("inquiry readiness requires SMTP while AI readiness remains independent", async () => {
  const env = {
    NODE_ENV: "test",
    SUPPORT_SESSION_SECRET: "fixture-session-secret-at-least-32-characters",
    NETLIFY_BLOBS_CONTEXT: Buffer.from(
      JSON.stringify({
        siteID: "fixture-site",
        token: "fixture-token",
        edgeURL: "https://storage.example.invalid",
        uncachedEdgeURL: "https://storage.example.invalid",
      }),
    ).toString("base64"),
    OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true",
    OPENWEBUI_BASE_URL: "https://assistant.example.invalid",
    OPENWEBUI_API_KEY: "fixture-ai-token",
    OPENWEBUI_MODEL_ID: "fixture-model",
    OPENWEBUI_KNOWLEDGE_ID: "fixture-knowledge",
    SUPPORT_SES_SMTP_HOST: "smtp.example.invalid",
    SUPPORT_SES_SMTP_PORT: "587",
    SUPPORT_SES_SMTP_USERNAME: "fixture-user",
    SUPPORT_SES_SMTP_PASSWORD: "",
    SUPPORT_INQUIRY_FROM_EMAIL: "sender@example.com",
    SUPPORT_INQUIRY_TO_EMAIL: "manager@example.com",
    SUPPORT_SENDER_SMTP_PASSWORD: "",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, env);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Readiness must not send network requests");
  };
  try {
    const request = () =>
      new Request("https://bun2too.com/api/support/session");
    assert.deepEqual(await (await GET(request())).json(), {
      inquiries: false,
      chat: true,
      inquiryUnavailableReasons: ["email"],
    });
    process.env.SUPPORT_SES_SMTP_PASSWORD = "fixture-password";
    assert.deepEqual(await (await GET(request())).json(), {
      inquiries: true,
      chat: true,
      inquiryUnavailableReasons: [],
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
