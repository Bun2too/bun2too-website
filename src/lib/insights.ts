import { insightsOrigin } from "./insights-origin";
export type Insight = {
  id: string;
  title: string;
  body: string;
  summary: string;
  published_at: string;
  url: string;
  image_url: string | null;
  image_alt: string;
  reading_minutes: number;
  source_urls: string[];
};
async function publicArticleJSON(path: string, allowMissing = false) {
  const base = insightsOrigin();
  let status: number | undefined;
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    });
    status = response.status;
    if (allowMissing && status === 404) return null;
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    console.error("Insights public API request failed", {
      endpoint: allowMissing
        ? "/insights/api/articles/{id}"
        : "/insights/api/articles",
      status: status ?? "network, timeout or redirect",
      reason:
        status === 200
          ? "invalid JSON; provider body withheld"
          : "provider details withheld",
    });
    throw new Error("Insights are temporarily unavailable");
  }
}
export async function getInsights(): Promise<Insight[]> {
  const data = await publicArticleJSON("/insights/api/articles");
  if (!data || !Array.isArray(data.articles)) {
    console.error("Insights index response invalid", {
      reason: "expected public articles array; provider body withheld",
    });
    throw new Error("Invalid insights response");
  }
  return data.articles.filter(
    (item: Insight) =>
      typeof item.id === "string" &&
      /^[a-zA-Z0-9-]+$/.test(item.id) &&
      typeof item.title === "string" &&
      typeof item.body === "string",
  );
}

export async function getInsight(id: string): Promise<Insight | null> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null;
  return publicArticleJSON(`/insights/api/articles/${id}`, true);
}
