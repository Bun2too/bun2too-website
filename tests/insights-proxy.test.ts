import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyInsights } from "../src/lib/insights-proxy";
test("editorial proxy fails closed and never forwards visitor credentials or backend redirects", async () => {
  const old = {
    origin: process.env.INSIGHTS_API_ORIGIN,
    fetch: globalThis.fetch,
  };
  try {
    delete process.env.INSIGHTS_API_ORIGIN;
    assert.equal(
      (
        await proxyInsights(
          new Request("https://bun2too.com/insights/feed.xml"),
          "/insights/feed.xml",
        )
      ).status,
      503,
    );
    process.env.INSIGHTS_API_ORIGIN = "https://editorial.example.invalid";
    let calls = 0;
    globalThis.fetch = async (_url, options) => {
      calls++;
      assert.equal(new Headers(options?.headers).get("authorization"), null);
      assert.equal(new Headers(options?.headers).get("cookie"), null);
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://editorial.example.invalid/insights",
          "set-cookie": "upstream=private",
        },
      });
    };
    const response = await proxyInsights(
      new Request("https://bun2too.com/insights/unsubscribe?token=fixture", {
        headers: { authorization: "Bearer fixture", cookie: "auth=fixture" },
      }),
      "/insights/unsubscribe",
    );
    assert.equal(response.headers.get("location"), "/insights");
    assert.equal(response.headers.get("set-cookie"), null);
    const denied = await proxyInsights(
      new Request("https://bun2too.com/api/insights/push-subscriptions", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      }),
      "/insights/push-subscriptions",
    );
    assert.equal(denied.status, 403);
    assert.equal(calls, 1);
    globalThis.fetch = async () =>
      new Response("private upstream details", { status: 500 });
    const unavailable = await proxyInsights(
      new Request("https://bun2too.com/insights/feed.xml"),
      "/insights/feed.xml",
    );
    assert.equal(unavailable.status, 503);
    assert.doesNotMatch(await unavailable.text(), /private upstream/);
  } finally {
    globalThis.fetch = old.fetch;
    if (old.origin === undefined) delete process.env.INSIGHTS_API_ORIGIN;
    else process.env.INSIGHTS_API_ORIGIN = old.origin;
  }
});
