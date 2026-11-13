import type { MetadataRoute } from "next";
import { getInsights } from "@/lib/insights";
import { absoluteUrl, indexable } from "@/lib/seo";
import { getCmsPages } from "@/lib/contentful";
export const revalidate = 300;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  const pages: MetadataRoute.Sitemap = (await getCmsPages()).map((page) => ({
    url: absoluteUrl(page.path),
  }));
  try {
    const articles = await getInsights();
    return [
      ...pages,
      ...articles.map((article) => ({
        url: absoluteUrl(`/insights/${article.id}`),
        ...(Number.isFinite(Date.parse(article.published_at))
          ? { lastModified: new Date(article.published_at) }
          : {}),
        ...(article.image_url ? { images: [article.image_url] } : {}),
      })),
    ];
  } catch {
    return pages;
  }
}
