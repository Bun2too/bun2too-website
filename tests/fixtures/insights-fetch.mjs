import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
  readFileSync(new URL("./insights.json", import.meta.url), "utf8"),
);
const upstream = globalThis.fetch;
// Preloaded only by fixture builds/browser servers. Intercept the reserved
// synthetic origin; never contact or replace a real editorial provider.
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== "https://editorial.example.invalid")
    return upstream(input, options);
  if (url.pathname === "/insights/api/articles") return Response.json(fixtures);
  if (url.pathname.startsWith("/insights/api/articles/")) {
    const article = fixtures.articles.find(
      (article) => url.pathname === `/insights/api/articles/${article.id}`,
    );
    return Response.json(article || { error: "not found" }, {
      status: article ? 200 : 404,
    });
  }
  if (["/insights/feed.xml", "/insights/feed.atom"].includes(url.pathname))
    return new Response(
      '<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture Insights</title></channel></rss>',
      { headers: { "Content-Type": "application/rss+xml" } },
    );
  if (url.pathname === "/insights/push-config")
    return Response.json({ public_key: "" });
  return Response.json({ error: "fixture route unavailable" }, { status: 404 });
};
