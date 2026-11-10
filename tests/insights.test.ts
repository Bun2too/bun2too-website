import test from "node:test";
import assert from "node:assert/strict";
import { getInsight, getInsights } from "../src/lib/insights";
process.env.INSIGHTS_API_ORIGIN = "https://editorial.example.invalid";
test("article fetch handles missing and unavailable articles distinctly", async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("{}", { status: 404 });
    };
    assert.equal(await getInsight("../private"), null);
    assert.equal(calls, 0);
    assert.equal(await getInsight("missing"), null);
    globalThis.fetch = async () => new Response("{}", { status: 503 });
    await assert.rejects(getInsight("published"));
  } finally {
    globalThis.fetch = original;
  }
});
test("index accepts public article IDs and rejects malformed entries", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        articles: [
          { id: "one", title: "Title", body: "Body" },
          { id: "../secret", title: "Bad", body: "Body" },
        ],
      });
    assert.equal((await getInsights()).length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("a temporary index failure is retried on the next call and never stored as an empty success", async () => {
  const original = globalThis.fetch;
  const oldLog = console.error;
  try {
    console.error = () => {};
    let calls = 0;
    globalThis.fetch = async () =>
      ++calls === 1
        ? new Response("unavailable", { status: 503 })
        : Response.json({
            articles: [
              { id: "recovered", title: "Recovered", body: "Public content" },
            ],
          });
    await assert.rejects(getInsights());
    assert.equal((await getInsights())[0].id, "recovered");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    console.error = oldLog;
  }
});
test("upstream HTML/network failures produce actionable server logs without exposing origin or body", async () => {
  const original = globalThis.fetch;
  const oldLog = console.error;
  const logs: unknown[] = [];
  try {
    console.error = (...args) => logs.push(args);
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.redirect, "error");
      assert.equal(new Headers(options?.headers).get("authorization"), null);
      return new Response("<html>fixture-private-challenge</html>");
    };
    await assert.rejects(getInsights());
    assert.match(JSON.stringify(logs), /invalid JSON/);
    assert.doesNotMatch(
      JSON.stringify(logs),
      /editorial.example.invalid|fixture-private-challenge/,
    );
  } finally {
    globalThis.fetch = original;
    console.error = oldLog;
  }
});
