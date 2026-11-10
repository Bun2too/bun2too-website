// Server-only configuration: never re-export this module to a client component.
export function insightsOrigin() {
  const configured = process.env.INSIGHTS_API_ORIGIN;
  if (!configured) {
    console.error("Insights configuration unavailable", {
      setting: "INSIGHTS_API_ORIGIN",
      reason: "missing",
    });
    throw new Error("Insights are temporarily unavailable");
  }
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    console.error("Insights configuration unavailable", {
      setting: "INSIGHTS_API_ORIGIN",
      reason: "invalid URL",
    });
    throw new Error("Insights are temporarily unavailable");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    console.error("Insights configuration unavailable", {
      setting: "INSIGHTS_API_ORIGIN",
      reason: "expected HTTPS origin without a path or credentials",
    });
    throw new Error("Insights are temporarily unavailable");
  }
  return url.origin;
}
