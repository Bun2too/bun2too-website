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
export async function getInsights(): Promise<Insight[]> {
  const base = insightsOrigin();
  const response = await fetch(`${base}/insights/api/articles`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Insights are temporarily unavailable");
  const data = await response.json();
  if (!Array.isArray(data.articles))
    throw new Error("Invalid insights response");
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
  const base = insightsOrigin();
  const response = await fetch(`${base}/insights/api/articles/${id}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Insight temporarily unavailable");
  return response.json();
}
