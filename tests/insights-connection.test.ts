import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyInsightsConnection } from "../scripts/deploy-config.mjs";
import fixtures from "./fixtures/insights.json";
const env = { INSIGHTS_API_ORIGIN: "https://editorial.example.invalid" };
test("public editorial connection checks index, article and RSS without forwarding credentials", async () => {
  const paths: string[] = [];
  const result = await verifyInsightsConnection(
    env,
    async (url: string, options: RequestInit) => {
      const path = new URL(url).pathname;
      paths.push(path);
      assert.equal(options.redirect, "error");
      assert.equal(new Headers(options.headers).get("authorization"), null);
      assert.equal(new Headers(options.headers).get("cookie"), null);
      if (path === "/insights/api/articles") return Response.json(fixtures);
      if (path.startsWith("/insights/api/articles/"))
        return Response.json(fixtures.articles[0]);
      return new Response("<rss><channel></channel></rss>");
    },
  );
  assert.equal(result, 1);
  assert.deepEqual(paths, [
    "/insights/api/articles",
    "/insights/api/articles/fixture-ai-delivery",
    "/insights/feed.xml",
  ]);
});
test("wrong origins and unavailable/HTML/malformed public APIs block deployment with safe diagnostics", async () => {
  await assert.rejects(
    verifyInsightsConnection(
      { INSIGHTS_API_ORIGIN: "https://editorial.example.invalid/insights" },
      () => assert.fail("must not fetch"),
    ),
    /origin only/,
  );
  for (const response of [
    new Response("fixture-private-upstream-error", { status: 403 }),
    new Response("<html>fixture-private-challenge</html>"),
    Response.json({
      articles: [{ id: "../private", title: "Title", body: "Body" }],
    }),
  ])
    await assert.rejects(
      verifyInsightsConnection(env, async () => response),
      (error: Error) => {
        assert.doesNotMatch(
          error.message,
          /fixture-private|editorial.example.invalid/,
        );
        return true;
      },
    );
});
