// Server-only configuration: never re-export this module to a client component.
export function insightsOrigin() {
  const configured = process.env.INSIGHTS_API_ORIGIN;
  if (!configured) throw new Error("Insights are temporarily unavailable");
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("Insights are temporarily unavailable");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Insights are temporarily unavailable");
  return url.origin;
}
