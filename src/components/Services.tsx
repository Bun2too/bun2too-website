import Icon from "./Icon";
import { capabilities } from "@/lib/site";
import PageArtwork from "./PageArtwork";
export default function Services({ full = false }: { full?: boolean }) {
  return (
    <section id="services" className="section shell">
      <div className={full ? "" : "section-visual-heading"}>
        <div className="section-heading">
          <p className="eyebrow">WHAT WE BUILD</p>
          <div>
            <h2>
              Good technology.
              <br />
              <span className="subtle">Better connections.</span>
            </h2>
            <p>
              Hands-on AI engineering, dependable AI environments, and connected
              customer technology. From the first workflow to systems your team
              can operate.
            </p>
          </div>
        </div>
        {!full && <PageArtwork name="ai-foundation" compact eager={false} />}
      </div>
      <div className="capability-grid">
        {capabilities.map((s) => (
          <article
            id={s.slug}
            className={`capability${s.featured ? " capability-featured" : ""}`}
            key={s.id}
          >
            <div className="capability-top">
              <span className="icon-tile">
                <Icon name={s.icon} />
              </span>
              <span className="mono">/{s.id}</span>
            </div>
            <p className="eyebrow">{s.short}</p>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            {full && (
              <ul className="tags">
                {s.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {full && (
        <div className="secondary-service">
          <Icon name="insight" size={30} />
          <div>
            <p className="eyebrow">ALSO IN OUR TOOLKIT</p>
            <h3>Fintech & applied experiments</h3>
            <p>
              We continue exploring financial technology, including stock-pick
              research and data-driven finance initiatives. These experiments
              sit alongside our core work in customer technology.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
