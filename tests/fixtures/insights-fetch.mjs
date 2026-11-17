import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
  readFileSync(new URL("./insights.json", import.meta.url), "utf8"),
);
const upstream = globalThis.fetch;
const cms = JSON.parse(
  readFileSync(
    new URL("../../src/content/website-seed.json", import.meta.url),
    "utf8",
  ),
);
// Preloaded only by fixture builds/browser servers. Intercept the reserved
// synthetic origin; never contact or replace a real editorial provider.
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (
    url.hostname === "cdn.contentful.com" &&
    url.pathname.startsWith("/spaces/fixture-space/")
  ) {
    const entries = cms.entries.map((entry) => ({
      sys: { id: entry.id, contentType: { sys: { id: entry.type } } },
      fields: entry.fields,
    }));
    const firstFaq = entries.find((entry) => entry.sys.id === "b2t-faq-1");
    firstFaq.fields = {
      ...firstFaq.fields,
      answer: firstFaq.fields.answer + " Published Contentful fixture.",
    };
    entries.push({
      sys: { id: "b2t-page-fixture", contentType: { sys: { id: "b2tPage" } } },
      fields: {
        name: "CMS fixture",
        path: "/cms-fixture",
        seoTitle: "Contentful fixture page",
        seoDescription: "A public CMS route from an isolated fixture.",
        layout: "default",
        blocks: [
          {
            sys: { type: "Link", linkType: "Entry", id: "b2t-block-approach" },
          },
          {
            sys: { type: "Link", linkType: "Entry", id: "b2t-block-home-hero" },
          },
        ],
      },
    });
    const items = entries.filter(
      (entry) =>
        entry.sys.contentType.sys.id === url.searchParams.get("content_type"),
    );
    const assets = cms.assets.map((asset) => ({
      sys: { id: asset.id },
      fields: {
        file: {
          url: asset.localPath,
          details: { image: { width: asset.width, height: asset.height } },
        },
      },
    }));
    return Response.json({
      total: items.length,
      items,
      includes: { Entry: entries, Asset: assets },
    });
  }
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
