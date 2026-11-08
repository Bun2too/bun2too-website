import StructuredData from "@/components/StructuredData";
import { pageMetadata, pageSchema } from "@/lib/seo";
import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import InsightUpdates from "@/components/InsightUpdates";
import { getInsights } from "@/lib/insights";
import { PageHero } from "@/components/PageArtwork";
export const metadata = {
  ...pageMetadata("/insights"),
  alternates: {
    canonical: "/insights",
    types: {
      "application/rss+xml": "/insights/feed.xml",
      "application/atom+xml": "/insights/feed.atom",
    },
  },
};
export default async function InsightsPage() {
  let articles: Awaited<ReturnType<typeof getInsights>> = [];
  let unavailable = false;
  try {
    articles = await getInsights();
  } catch {
    unavailable = true;
  }
  return (
    <main id="main-content" className="insights-page">
      <StructuredData data={pageSchema("/insights")} />
      <section className="shell insights-heading">
        <PageHero artwork="knowledge-library">
          <p className="eyebrow">BUN2TOO / FIELD NOTES</p>
          <h1>
            Human thinking.
            <br />
            <em>New possibilities.</em>
          </h1>
          <p>
            Practical perspectives on AI, software engineering, and customer
            technology. Ideas with sources. Lessons you can use.
          </p>
          <div className="insights-topics">
            <span>AI & automation</span>
            <span>Engineering practice</span>
            <span>Customer technology</span>
          </div>
        </PageHero>
      </section>
      <InsightUpdates
        articles={articles.map(({ id, title, published_at }) => ({
          id,
          title,
          published_at,
        }))}
      />
      <section className="shell insights-grid" aria-label="Latest insights">
        {unavailable ? (
          <div role="status" className="insights-empty">
            <h2>Taking a short pause.</h2>
            <p>
              We couldn’t load the articles just now. Please try again shortly.
            </p>
            <a href="/insights">Try again ↗</a>
          </div>
        ) : articles.length === 0 ? (
          <p className="insights-empty">Our next field note is on its way.</p>
        ) : (
          articles.map((article, index) => (
            <article
              className={`insight-card ${index === 0 ? "insight-featured" : ""}`}
              key={article.id}
            >
              <Link
                href={`/insights/${article.id}`}
                className="insight-image"
                tabIndex={-1}
                aria-hidden="true"
              >
                {article.image_url ? (
                  <img
                    src={article.image_url}
                    alt=""
                    loading={index === 0 ? "eager" : "lazy"}
                    width="1536"
                    height="1024"
                  />
                ) : (
                  <span className="insight-placeholder">
                    Ideas.
                    <br />
                    <em>Connected.</em>
                  </span>
                )}
              </Link>
              <div className="insight-copy">
                <p className="eyebrow">
                  {index === 0 ? "LATEST PERSPECTIVE" : "FIELD NOTE"} ·{" "}
                  {article.reading_minutes} MIN READ
                </p>
                <h2>
                  <Link href={`/insights/${article.id}`}>{article.title}</Link>
                </h2>
                <p>{article.summary}</p>
                <div className="insight-meta">
                  <time dateTime={article.published_at}>
                    {new Date(article.published_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "America/Chicago",
                      },
                    )}
                  </time>
                  <Link
                    href={`/insights/${article.id}`}
                    aria-label={`Read ${article.title}`}
                  >
                    Read the story ↗
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
      <Newsletter insights />
    </main>
  );
}
