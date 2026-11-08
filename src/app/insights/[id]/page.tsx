import StructuredData from "@/components/StructuredData";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import Newsletter from "@/components/Newsletter";
import { getInsight } from "@/lib/insights";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const article = await getInsight(id);
    if (article) {
      const metadata = pageMetadata(
        `/insights/${id}`,
        article.title,
        article.summary,
      );
      return {
        ...metadata,
        openGraph: {
          ...metadata.openGraph,
          type: "article",
          ...(Number.isFinite(Date.parse(article.published_at))
            ? { publishedTime: article.published_at }
            : {}),
          ...(article.image_url
            ? { images: [{ url: article.image_url, alt: article.image_alt }] }
            : {}),
        },
      };
    }
  } catch {}
  return {
    title: "Insight temporarily unavailable",
    robots: { index: false, follow: true },
  };
}
export default async function InsightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let article;
  try {
    article = await getInsight(id);
  } catch {
    return (
      <main id="main-content" className="shell page-header">
        <h1>Article temporarily unavailable</h1>
        <p>Please try again shortly.</p>
        <Link href="/insights">Back to insights</Link>
      </main>
    );
  }
  if (!article) notFound();
  return (
    <main id="main-content" className="insights-page">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": absoluteUrl(`/insights/${id}#article`),
              headline: article.title,
              description: article.summary,
              mainEntityOfPage: absoluteUrl(`/insights/${id}`),
              author: {
                "@type": "Organization",
                name: "Bun2Too Editorial Team",
              },
              publisher: { "@id": absoluteUrl("/#organization") },
              ...(Number.isFinite(Date.parse(article.published_at))
                ? { datePublished: article.published_at }
                : {}),
              image: article.image_url || absoluteUrl("/og"),
              inLanguage: "en",
              wordCount: article.body.trim().split(/\s+/).length,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Bun2Too",
                  item: absoluteUrl("/"),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Insights",
                  item: absoluteUrl("/insights"),
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: article.title,
                  item: absoluteUrl(`/insights/${id}`),
                },
              ],
            },
          ],
        }}
      />
      <header className="shell insight-detail-head">
        <Link className="eyebrow" href="/insights">
          ← ALL INSIGHTS
        </Link>
        <h1>{article.title}</h1>
        <p>
          Bun2Too Editorial Team · {article.reading_minutes} min read ·{" "}
          <time dateTime={article.published_at}>
            {new Date(article.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "America/Chicago",
            })}
          </time>
        </p>
      </header>
      {article.image_url && (
        <figure className="shell insight-detail-image">
          <img
            src={article.image_url}
            alt={article.image_alt}
            width="1536"
            height="1024"
          />
          <figcaption>Original AI-generated editorial artwork</figcaption>
        </figure>
      )}
      <article className="insight-prose">
        {article.body
          .split(/\n\s*\n/)
          .map((part, i) =>
            part.startsWith("## ") ? (
              <h2 key={i}>{part.replace(/^#+\s*/, "")}</h2>
            ) : (
              <p key={i}>{part}</p>
            ),
          )}
      </article>
      {!!article.source_urls.length && (
        <aside className="insight-prose insight-sources">
          <h2>Sources & further reading</h2>
          <ul>
            {article.source_urls
              .filter((url) => url.startsWith("https://"))
              .map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {new URL(url).hostname} ↗
                  </a>
                </li>
              ))}
          </ul>
        </aside>
      )}
      <Newsletter insights />
    </main>
  );
}
