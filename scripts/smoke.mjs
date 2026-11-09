let base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
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
  if (route === "/" && !(await response.text()).includes("Make every"))
    throw new Error("Home page content is missing");
  console.log(`OK ${route}`);
}
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
for (const route of ["/api/support/inquiries"]) {
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
