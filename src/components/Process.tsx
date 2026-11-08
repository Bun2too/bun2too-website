import { processSteps } from "@/lib/site";
import PageArtwork from "./PageArtwork";
export default function Process({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`section shell ${compact ? "process-compact" : ""}`}>
      <div className={compact ? "section-visual-heading" : ""}>
        <div className="section-heading">
          <p className="eyebrow">HOW WE WORK</p>
          <div>
            <h2>
              Start with people.
              <br />
              <span className="subtle">Build the connections.</span>
            </h2>
            <p>
              Clear thinking, practical delivery, and room to learn. A
              collaborative path from disconnected tools to a connected customer
              experience.
            </p>
          </div>
        </div>
        {compact && (
          <PageArtwork name="delivery-journey" compact eager={false} />
        )}
      </div>
      <ol className="process-list">
        {processSteps.map((s, i) => (
          <li key={s.label}>
            <span className="step-number">0{i + 1}</span>
            <div>
              <p className="eyebrow">{s.label}</p>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="deliverable">↳ {s.deliverable}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
