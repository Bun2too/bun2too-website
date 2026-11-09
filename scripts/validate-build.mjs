import { readFile } from "node:fs/promises";
const manifest = JSON.parse(
  await readFile(
    `${process.env.NEXT_BUILD_DIR || ".next"}/server/app-paths-manifest.json`,
    "utf8",
  ),
);
for (const route of [
  "/page",
  "/process/page",
  "/cta/page",
  "/services/page",
  "/articles/page",
  "/insights/page",
  "/insights/[id]/page",
  "/insights/signup/page",
  "/account/page",
  "/api/subscriptions/route",
  "/api/preferences/route",
  "/api/insights/push-config/route",
  "/api/insights/push-subscriptions/route",
  "/insights/feed.xml/route",
  "/insights/feed.atom/route",
  "/insights/unsubscribe/route",
  "/support/page",
  "/cookies/page",
  "/terms/page",
  "/robots.txt/route",
  "/sitemap.xml/route",
  "/llms.txt/route",
  "/api/support/inquiries/route",
]) {
  if (!manifest[route])
    throw new Error(
      `The production build is missing ${route}. Stop any process sharing the output directory or set NEXT_BUILD_DIR to an isolated directory.`,
    );
}
console.log(
  "Verified required pages and API routes in the production artifact.",
);
await import("./check-browser-secrets.mjs");
