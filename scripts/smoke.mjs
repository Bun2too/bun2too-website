let base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
let insightsHTML = "";
let homeHTML = "";
const routes = [
  "/",
  "/services",
  "/process",
  "/usecases",
  "/articles",
  "/insights",
  "/cta",
  "/hero",
  "/contact",
  "/account",
  "/privacy",
  "/cookies",
  "/terms",
  "/support",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/og",
  "/images/customer-architecture.svg",
  "/bun2too/logo.png",
  "/images/artwork/knowledge-library.webp",
];
for (const route of routes) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(new URL(route, base), {
      signal: AbortSignal.timeout(30000),
    });
    if (response.ok) break;
  }
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  if (route === "/") base = new URL(response.url).origin;
  if (route === "/") {
    homeHTML = await response.text();
    if (!homeHTML.includes("Make every"))
      throw new Error("Home page content is missing");
  }
  if (/\.(?:svg|png|webp)$/.test(route)) {
    if (!response.headers.get("content-type")?.startsWith("image/"))
      throw new Error(
        `${route}: expected an image response, not an HTML fallback`,
      );
    await response.body?.cancel();
  }
  if (route === "/insights") insightsHTML = await response.text();
  console.log(`OK ${route}`);
}
const browserAssets = new Set(
  Array.from(
    homeHTML.matchAll(
      /(?:src|href)="([^"<>]*\/_next\/static\/[^"<>]+\.(?:js|css)(?:\?[^"<>]*)?)"/g,
    ),
    (match) => match[1],
  ),
);
if (
  !Array.from(browserAssets).some((asset) =>
    new URL(asset, base).pathname.endsWith(".js"),
  )
)
  throw new Error("Homepage exposes no browser JavaScript asset references");
for (const asset of browserAssets) {
  const url = new URL(asset, base);
  if (url.origin !== new URL(base).origin)
    throw new Error("Unexpected external browser asset origin");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const type = response.headers.get("content-type") || "";
  const correctType = url.pathname.endsWith(".css")
    ? type.startsWith("text/css")
    : /(?:java|ecma)script/i.test(type);
  await response.body?.cancel();
  if (!response.ok || !correctType)
    throw new Error(
      `${url.pathname}: browser asset unavailable or incorrect content type (HTTP ${response.status})`,
    );
}
console.log(
  `OK ${browserAssets.size} referenced browser JavaScript/CSS assets`,
);
const api = await fetch(new URL("/api/subscriptions", base), {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: new URL(base).origin },
  body: JSON.stringify({
    email: "invalid",
    consent: true,
    topics: ["customer-technology"],
  }),
});
if (api.status !== 400)
  throw new Error(`Subscription API expected 400, got ${api.status}`);
console.log("OK subscription API validation");
const privateApi = await fetch(new URL("/api/preferences", base));
if (privateApi.status !== 401)
  throw new Error(`Preferences API expected 401, got ${privateApi.status}`);
console.log("OK preferences API authorization");
for (const route of ["/api/support/inquiries", "/api/support/chat"]) {
  const response = await fetch(new URL(route, base), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
    },
    body: JSON.stringify({ consent: true, message: "" }),
  });
  if (response.status !== 400)
    throw new Error(
      `${route}: expected input validation HTTP 400, got ${response.status}`,
    );
  console.log(`OK ${route} validation`);
}
if (process.env.SMOKE_REQUIRE_INTEGRATIONS === "true") {
  if (!/data-insights-state="(?:ready|empty)"/.test(insightsHTML))
    throw new Error(
      "Deployed Insights did not load its article index. HTTP 200 with an unavailable message is not a successful connection. Check INSIGHTS_API_ORIGIN and the public backend API.",
    );
  const article = insightsHTML.match(/href="(\/insights\/[a-zA-Z0-9-]+)"/);
  if (insightsHTML.includes('data-insights-state="ready"')) {
    if (!article)
      throw new Error("Insights reports articles but exposes no article link");
    const detail = await fetch(new URL(article[1], base), {
      signal: AbortSignal.timeout(30000),
    });
    if (
      !detail.ok ||
      !(await detail.text()).includes('<article class="insight-prose"')
    )
      throw new Error("Deployed Insights article body did not load");
  }
  const feed = await fetch(new URL("/insights/feed.xml", base), {
    signal: AbortSignal.timeout(20000),
  });
  if (!feed.ok || !/<rss\b|<feed\b/i.test(await feed.text()))
    throw new Error(
      "Deployed Insights feed is unavailable. Check INSIGHTS_API_ORIGIN in the selected Netlify site's runtime.",
    );
  console.log(
    "OK deployed Insights article index, detail where available, and RSS feed",
  );
  const response = await fetch(new URL("/api/support/session", base), {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const state = response.ok ? await response.json() : {};
  if (!response.ok || state.inquiries !== true)
    throw new Error(
      "Deployed inquiry session is unavailable. Verify SUPPORT_SESSION_SECRET, both Turnstile settings, and Netlify Blobs runtime context; values withheld.",
    );
  if (process.env.SMOKE_REQUIRE_AI === "true" && state.chat !== true)
    throw new Error(
      "AI support was enabled but the deployed runtime is not ready. Verify the OPENWEBUI_* configuration; values withheld.",
    );
  console.log("OK deployed support readiness (no inquiry or AI request sent)");
}
