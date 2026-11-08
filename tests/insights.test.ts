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
