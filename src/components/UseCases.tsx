import Link from "next/link";
import Icon from "./Icon";
import { PageHero } from "./PageArtwork";
const cases = [
  {
    category: "AI FORWARD-DEPLOYED ENGINEERING",
    title: "From a prototype to the workday.",
    text: "Work alongside a business team to put AI into a real workflow. Connect approved knowledge to a RAG assistant, integrate with existing systems, and evaluate the result against the team's day-to-day needs.",
    icon: "engineering",
    detail: "Embedded delivery + AI applications + evaluation",
  },
  {
    category: "AI INFRASTRUCTURE & ENVIRONMENTS",
    title: "An environment your team can own.",
    text: "Bring model serving, retrieval, secrets, monitoring, and release processes into a documented AI environment configured for your cloud or self-hosted setup.",
    icon: "infrastructure",
    detail: "Model serving + retrieval + operations",
  },
  {
    category: "CUSTOMER DATA",
    title: "One customer. A clearer picture.",
    text: "Connect CRM, product events, and support interactions into a consistent customer profile, with consent carried alongside each signal.",
    icon: "data",
    detail: "CDP + integration + data quality",
  },
  {
    category: "IDENTITY & TRUST",
    title: "A welcome without the friction.",
    text: "Bring sign-in, account creation, and communication choices into a coherent customer journey, with identity managed through a trusted provider.",
    icon: "identity",
    detail: "CIAM + Auth0 + preferences",
  },
  {
    category: "CUSTOMER INTELLIGENCE",
    title: "Find the moments that matter.",
    text: "Make customer journeys easier to understand. Connect analytics to operational workflows so teams can act on meaningful signals.",
    icon: "insight",
    detail: "Journey analytics + AI automation",
  },
  {
    category: "FINTECH EXPLORATION",
    title: "Room for the next experiment.",
    text: "Explore stock-pick research and financial data workflows as part of our wider interest in useful, applied technology.",
    icon: "consent",
    detail: "Financial data + research workflows",
  },
];
export default function UseCases() {
  return (
    <section className="section shell">
      <PageHero artwork="connected-intelligence">
        <p className="eyebrow">POSSIBILITIES, MADE PRACTICAL</p>
        <h1 className="page-title">
          Better experiences
          <br />
          start <em>behind the scenes.</em>
        </h1>
        <p className="page-intro">
          Illustrative ways AI and customer technology can solve everyday
          problems. Every engagement starts with your systems and your
          customers.
        </p>
      </PageHero>
      <div className="usecase-grid">
        {cases.map((c) => (
          <article className="usecase" key={c.title}>
            <Icon name={c.icon} size={44} />
            <p className="eyebrow">{c.category}</p>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <span className="deliverable">{c.detail}</span>
          </article>
        ))}
      </div>
      <Link href="/contact" className="button button-lime">
        Talk about your use case <Icon name="arrow" />
      </Link>
    </section>
  );
}
