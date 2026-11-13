import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { BlobsServer } from "@netlify/blobs/server";
import {
  answerQuestion,
  publicSupportConfig,
} from "../../src/lib/openwebui.ts";
import { handleSupportChat } from "../../src/lib/support-chat.ts";
import { GET as session } from "../../src/app/api/support/session/route.ts";

export async function supportAdapter() {
  if (!publicSupportConfig())
    throw new Error(
      "Configure the evaluation environment's OPENWEBUI settings",
    );
  const directory = await mkdtemp(join(tmpdir(), "support-eval-"));
  const token = randomBytes(32).toString("hex");
  // Recreate with a known isolated token; no deployment/customer store is used.
  const local = new BlobsServer({ directory, token });
  const { port } = await local.start();
  const origin = `http://localhost:${port}`;
  const originalEnv = { ...process.env },
    originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    NODE_ENV: "test",
    NETLIFY_DEV: "true",
    SUPPORT_SESSION_SECRET: randomBytes(32).toString("hex"),
    TURNSTILE_SECRET_KEY: "fixture-captcha-secret",
    NETLIFY_BLOBS_CONTEXT: Buffer.from(
      JSON.stringify({
        siteID: "fixture-eval-site",
        token,
        edgeURL: origin,
        uncachedEdgeURL: origin,
      }),
    ).toString("base64"),
  });
  const base = "https://website.example.invalid";
  let calls = [],
    trace = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.origin === origin) return originalFetch(input, options);
    if (url.hostname === "challenges.cloudflare.com")
      return Response.json({
        success: true,
        hostname: new URL(base).hostname,
        action: "support-chat",
      });
    const config = publicSupportConfig();
    if (
      url.origin !== config.origin ||
      url.pathname !== "/api/chat/completions"
    )
      throw new Error("Unexpected evaluation network destination");
    const request = JSON.parse(String(options.body));
    const entry = {
      component: "support.answer",
      input: request.messages.at(-1).content,
      output: null,
    };
    calls.push(entry);
    return originalFetch(input, options);
  };
  return {
    async runCase(example, suite) {
      calls = [];
      trace = [];
      const response = await session(
        new Request(base + "/api/support/session"),
      );
      const cookie = response.headers.get("set-cookie")?.split(";")[0] || "";
      let output,
        status = 200;
      if (suite === "component")
        output = await answerQuestion(example.question);
      else {
        const request = new Request(base + "/api/support/chat", {
          method: "POST",
          headers: {
            Origin: example.invalidOrigin
              ? "https://other.example.invalid"
              : base,
            Cookie: example.missingSession ? "" : cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: example.question,
            consent: !example.noConsent,
            captchaToken: "fixture-token",
          }),
        });
        const result = await handleSupportChat(request, (event) =>
          trace.push(event),
        );
        status = result.status;
        output = await result.json();
      }
      if (calls.length === 1)
        calls[0].output =
          output.answer || "The application rejected the candidate output.";
      const rejected =
        example.noConsent || example.invalidOrigin || example.missingSession;
      const expectedStatus = example.invalidOrigin
        ? 403
        : example.missingSession
          ? 401
          : example.noConsent
            ? 400
            : 200;
      const completed = trace
        .filter((event) => event.outcome === "completed")
        .map((event) => event.stage);
      return {
        calls,
        trace,
        checks: [
          { name: "expected-result", passed: status === expectedStatus },
          {
            name: "paid-call-count",
            passed: calls.length === (rejected ? 0 : 1),
          },
          {
            name: "visible-answer",
            passed: rejected
              ? !output.answer
              : typeof output.answer === "string" && output.answer.length > 0,
          },
          ...(suite === "trajectory"
            ? [
                {
                  name: "observed-stage-order",
                  passed: rejected
                    ? !trace.some((event) => event.stage === "ai-provider")
                    : JSON.stringify(completed) ===
                      JSON.stringify([
                        "validation",
                        "session",
                        "rate-limit-storage",
                        "captcha",
                        "ai-provider",
                        "response",
                      ]),
                },
              ]
            : []),
        ],
      };
    },
    async close() {
      globalThis.fetch = originalFetch;
      for (const key of Object.keys(process.env))
        if (!(key in originalEnv)) delete process.env[key];
      Object.assign(process.env, originalEnv);
      await local.stop();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
