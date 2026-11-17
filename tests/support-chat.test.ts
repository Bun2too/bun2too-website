import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/support/chat/route";
import { RequestError } from "../src/lib/consent";
import { supportDeadline } from "../src/lib/support-deadline";
import { SUPPORT_COOKIE, visitor } from "../src/lib/support";

const env = {
  NODE_ENV: "test",
  OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true",
  OPENWEBUI_BASE_URL: "https://assistant.example.invalid",
  OPENWEBUI_API_KEY: "fixture-service-credential",
  OPENWEBUI_MODEL_ID: "fixture-support-model",
  OPENWEBUI_KNOWLEDGE_ID: "fixture-public-knowledge",
  TURNSTILE_SECRET_KEY: "fixture-captcha-secret",
  SUPPORT_SESSION_SECRET: "fixture-session-secret-at-least-32-characters",
  NETLIFY_BLOBS_CONTEXT: Buffer.from(
    JSON.stringify({
      siteID: "fixture-site",
      token: "fixture-storage-token",
      edgeURL: "https://storage.example.invalid",
      uncachedEdgeURL: "https://storage.example.invalid",
    }),
  ).toString("base64"),
};

function fixture() {
  const oldEnv = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  const oldFetch = globalThis.fetch;
  const oldInfo = console.info;
  const oldError = console.error;
  const logs: unknown[][] = [];
  Object.assign(process.env, env);
  console.info = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  const identity = visitor(
    new Request("https://bun2too.com"),
    env.SUPPORT_SESSION_SECRET,
  );
  return {
    logs,
    request: () =>
      new Request("https://bun2too.com/api/support/chat", {
        method: "POST",
        headers: {
          Origin: "https://bun2too.com",
          "Content-Type": "application/json",
          Cookie: `${SUPPORT_COOKIE}=${identity.value}`,
        },
        body: JSON.stringify({
          question: "What services are offered?",
          consent: true,
          captchaToken: "fixture-captcha-token",
        }),
      }),
    restore: () => {
      globalThis.fetch = oldFetch;
      console.info = oldInfo;
      console.error = oldError;
      for (const [key, value] of Object.entries(oldEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
}

test("stalled rate-limit storage returns JSON and never reaches CAPTCHA or AI", async (context) => {
  const setup = fixture();
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let started!: () => void;
  const storageStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let storageSignal: AbortSignal | undefined;
  const destinations: string[] = [];
  globalThis.fetch = async (input, options) => {
    destinations.push(new URL(String(input)).hostname);
    storageSignal = options?.signal ?? undefined;
    started();
    return new Promise<Response>(() => {});
  };
  try {
    const pending = POST(setup.request());
    await storageStarted;
    context.mock.timers.tick(4000);
    const response = await pending;
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /took too long/);
    assert.deepEqual(destinations, ["storage.example.invalid"]);
    assert.equal(storageSignal?.aborted, true);
    assert.match(JSON.stringify(setup.logs), /rate-limit-storage/);
    assert.doesNotMatch(
      JSON.stringify(setup.logs),
      /fixture-storage-token|What services/,
    );
  } finally {
    setup.restore();
    context.mock.timers.reset();
  }
});

test("CAPTCHA rejection after healthy storage prevents any AI request", async () => {
  const setup = fixture();
  const destinations: string[] = [];
  globalThis.fetch = async (input, options) => {
    const hostname = new URL(String(input)).hostname;
    destinations.push(hostname);
    if (hostname === "storage.example.invalid")
      return new Response(null, {
        status: options?.method === "get" ? 404 : 200,
        headers: { etag: "fixture-etag" },
      });
    assert.equal(hostname, "challenges.cloudflare.com");
    return Response.json({ success: false });
  };
  try {
    const response = await POST(setup.request());
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Verification expired/);
    assert.equal(destinations.at(-1), "challenges.cloudflare.com");
    assert.equal(destinations.includes("assistant.example.invalid"), false);
  } finally {
    setup.restore();
  }
});

test("healthy storage and CAPTCHA allow one AI request and return the answer", async () => {
  const setup = fixture();
  let providerCalls = 0;
  globalThis.fetch = async (input, options) => {
    const hostname = new URL(String(input)).hostname;
    assert.equal(options?.signal?.aborted, false);
    if (hostname === "storage.example.invalid")
      return new Response(null, {
        status: options?.method === "get" ? 404 : 200,
        headers: { etag: "fixture-etag" },
      });
    if (hostname === "challenges.cloudflare.com")
      return Response.json({
        success: true,
        hostname: "bun2too.com",
        action: "support-chat",
      });
    assert.equal(hostname, "assistant.example.invalid");
    providerCalls++;
    return Response.json({
      choices: [{ message: { content: "Bun2Too helps with AI engineering." } }],
    });
  };
  try {
    const response = await POST(setup.request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      answer: "Bun2Too helps with AI engineering.",
    });
    assert.equal(providerCalls, 1);
  } finally {
    setup.restore();
  }
});

test("overall deadline stops a provider body that stalls after response headers", async (context) => {
  const setup = fixture();
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let reachedBody!: () => void;
  const reading = new Promise<void>((resolve) => {
    reachedBody = resolve;
  });
  let providerSignal: AbortSignal | undefined;
  globalThis.fetch = async (input, options) => {
    const hostname = new URL(String(input)).hostname;
    if (hostname === "storage.example.invalid")
      return new Response(null, {
        status: options?.method === "get" ? 404 : 200,
        headers: { etag: "fixture-etag" },
      });
    if (hostname === "challenges.cloudflare.com")
      return Response.json({
        success: true,
        hostname: "bun2too.com",
        action: "support-chat",
      });
    assert.equal(hostname, "assistant.example.invalid");
    providerSignal = options?.signal ?? undefined;
    return new Response(
      new ReadableStream({
        pull() {
          reachedBody();
          return new Promise(() => {});
        },
      }),
    );
  };
  try {
    const pending = POST(setup.request());
    await reading;
    context.mock.timers.tick(25000);
    const response = await pending;
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /took too long/);
    assert.equal(providerSignal?.aborted, true);
    assert.match(JSON.stringify(setup.logs), /ai-provider/);
  } finally {
    setup.restore();
    context.mock.timers.reset();
  }
});

test("a cancelled browser request cannot start another downstream operation", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(
    supportDeadline(
      async () => {
        called = true;
      },
      100,
      controller.signal,
    ),
    RequestError,
  );
  assert.equal(called, false);
});
