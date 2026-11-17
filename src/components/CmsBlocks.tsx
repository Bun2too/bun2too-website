import Link from "next/link";
import type { CmsBlock } from "@/lib/cms-types";
import type { ArtworkName } from "./PageArtwork";
import PageArtwork, { PageHero } from "./PageArtwork";
import CmsRichText, { CmsActionView } from "./CmsRichText";
import Icon from "./Icon";
import Newsletter from "./Newsletter";
import StructuredData from "./StructuredData";
import { absoluteUrl } from "@/lib/seo";
import InsightsFeed from "./InsightsFeed";

function Actions({ block }: { block: CmsBlock }) {
  return (
    <>
      {block.actions.map((action) => (
        <CmsActionView key={action.id} action={action} />
      ))}
    </>
  );
}
function Heading({
  block,
  subtle = false,
}: {
  block: CmsBlock;
  subtle?: boolean;
}) {
  return <CmsRichText document={block.heading} inline subtle={subtle} />;
}
function Artwork({
  block,
  compact = false,
}: {
  block: CmsBlock;
  compact?: boolean;
}) {
  return (
    <PageArtwork
      name={(block.artwork?.key || "human-connection") as ArtworkName}
      image={block.artwork}
      compact={compact}
      eager={false}
    />
  );
}

export default function CmsBlocks({
  blocks,
  contained = false,
}: {
  blocks: CmsBlock[];
  contained?: boolean;
}) {
  return (
    <>
      {blocks.map((block) => (
        <CmsBlockView key={block.id} block={block} contained={contained} />
      ))}
    </>
  );
}
export function CmsBlockView({
  block,
  contained = false,
}: {
  block: CmsBlock;
  contained?: boolean;
}) {
  const b = block;
  switch (b.kind) {
    case "hero":
      return (
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> {b.eyebrow}
            </p>
            <h1>
              <Heading block={b} />
            </h1>
            <p className="hero-description">
              <CmsRichText document={b.body} inline />
            </p>
            <div className="actions">
              <Actions block={b} />
            </div>
            <div className="hero-footnote">
              {b.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <div className="article-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="orbit orbit-three" />
            <img
              className="article-brand-mark"
              src="/bun2too/logo.png"
              alt=""
              width={180}
              height={180}
            />
            <span className="mono">
              <CmsRichText document={b.note} inline />
            </span>
          </div>
        </section>
      );
    case "intro": {
      const content = (
        <>
          <p className="eyebrow">{b.eyebrow}</p>
          <h1 className={b.variant === "insights" ? undefined : "page-title"}>
            <Heading block={b} />
          </h1>
          {b.body.content.length > 0 && (
            <p className={b.variant === "insights" ? undefined : "page-intro"}>
              <CmsRichText document={b.body} inline />
            </p>
          )}
          {b.actions.length > 0 && (
            <div className="actions">
              <Actions block={b} />
            </div>
          )}
          {b.note.content.length > 0 && (
            <p
              className={
                b.variant === "support" ? "support-intro-note" : "small"
              }
            >
              <CmsRichText document={b.note} inline />
            </p>
          )}
          {b.labels.length > 0 && (
            <div className="insights-topics">
              {b.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          )}
        </>
      );
      if (b.variant === "legal")
        return (
          <header className="legal-visual-header">
            <div>{content}</div>
            <Artwork block={b} compact />
          </header>
        );
      const hero = (
        <PageHero
          artwork={(b.artwork?.key || "human-connection") as ArtworkName}
          image={b.artwork}
          className={
            b.variant === "support"
              ? "support-visual-header"
              : b.variant === "insights" || contained
                ? ""
                : "page-header shell"
          }
        >
          {content}
        </PageHero>
      );
      return b.variant === "insights" ? (
        <section className="shell insights-heading">{hero}</section>
      ) : (
        hero
      );
    }
    case "focusStrip":
      return b.variant === "contact" ? (
        <section
          className="shell contact-detail-strip"
          aria-label="Ways we can help"
        >
          {b.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </section>
      ) : (
        <div className="focus-strip">
          <div className="shell">
            {b.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      );
    case "services": {
      const full = b.variant === "full";
      return (
        <section id="services" className="section shell">
          <div className={full ? "" : "section-visual-heading"}>
            <div className="section-heading">
              <p className="eyebrow">{b.eyebrow}</p>
              <div>
                <h2>
                  <Heading block={b} subtle />
                </h2>
                <CmsRichText document={b.body} />
              </div>
            </div>
            {!full && <Artwork block={b} compact />}
          </div>
          <div className="capability-grid">
            {b.items.map((item) => (
              <article
                id={item.slug}
                className={`capability${item.featured ? " capability-featured" : ""}`}
                key={item.id}
              >
                <div className="capability-top">
                  <span className="icon-tile">
                    <Icon name={item.icon} />
                  </span>
                  <span className="mono">/{item.number}</span>
                </div>
                <p className="eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {full && (
                  <ul className="tags">
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
          {full && b.secondary && (
            <div className="secondary-service">
              <Icon name="insight" size={30} />
              <div>
                <p className="eyebrow">{b.secondary.eyebrow}</p>
                <h3>
                  <Heading block={b.secondary} />
                </h3>
                <CmsRichText document={b.secondary.body} />
              </div>
            </div>
          )}
        </section>
      );
    }
    case "approach":
      return (
        <section className="approach-teaser shell">
          <p className="eyebrow">{b.eyebrow}</p>
          <h2>
            <Heading block={b} />
          </h2>
          <div>
            <CmsRichText document={b.body} />
            <Actions block={b} />
          </div>
        </section>
      );
    case "process":
      return (
        <section
          className={`section shell ${b.variant === "compact" ? "process-compact" : ""}`}
        >
          <div
            className={b.variant === "compact" ? "section-visual-heading" : ""}
          >
            <div className="section-heading">
              <p className="eyebrow">{b.eyebrow}</p>
              <div>
                <h2>
                  <Heading block={b} subtle />
                </h2>
                <CmsRichText document={b.body} />
              </div>
            </div>
            {b.variant === "compact" && <Artwork block={b} compact />}
          </div>
          <ol className="process-list">
            {b.items.map((item) => (
              <li key={item.id}>
                <span className="step-number">{item.number}</span>
                <div>
                  <p className="eyebrow">{item.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <span className="deliverable">↳ {item.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    case "useCases":
      return (
        <section className={contained ? undefined : "section shell"}>
          <div className="usecase-grid">
            {b.items.map((item) => (
              <article className="usecase" key={item.id}>
                <Icon name={item.icon} size={44} />
                <p className="eyebrow">{item.eyebrow}</p>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <span className="deliverable">{item.detail}</span>
              </article>
            ))}
          </div>
          <Actions block={b} />
        </section>
      );
    case "insightsPromotion":
      return (
        <section className="articles-section shell">
          <div className="articles-copy">
            <p className="eyebrow">{b.eyebrow}</p>
            <h2>
              <Heading block={b} />
            </h2>
            <CmsRichText document={b.body} />
            <Actions block={b} />
            <p className="small">
              <CmsRichText document={b.note} inline />
            </p>
          </div>
        </section>
      );
    case "newsletter":
      return (
        <Newsletter
          insights={b.variant === "insights"}
          content={{ eyebrow: b.eyebrow, heading: b.heading, body: b.body }}
        />
      );
    case "cta":
      return (
        <section className="cta-section shell">
          <div className="cta-visual">
            <Artwork block={b} />
          </div>
          <div>
            <p className="eyebrow">{b.eyebrow}</p>
            <h2>
              <Heading block={b} />
            </h2>
          </div>
          <div>
            <CmsRichText document={b.body} />
            <Actions block={b} />
          </div>
        </section>
      );
    case "faq":
      return (
        <>
          <StructuredData
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "@id": absoluteUrl("/support#questions"),
              mainEntity: b.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            }}
          />
          <section
            className="support-faqs"
            aria-label="Frequently asked questions"
          >
            {b.faqs.map((faq) => (
              <details key={faq.id}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
                <Link href={faq.path}>Learn more ↗</Link>
              </details>
            ))}
          </section>
        </>
      );
    case "richText":
      return (
        <section {...(b.anchor ? { id: b.anchor } : {})}>
          <CmsRichText document={b.heading} />
          <CmsRichText document={b.body} />
          {b.note.content.length > 0 && (
            <p className="small">
              <CmsRichText document={b.note} inline />
            </p>
          )}
        </section>
      );
    case "insightsFeed":
      return <InsightsFeed />;
  }
}
