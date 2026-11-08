import Link from "next/link";
import Icon from "./Icon";
import Image from "next/image";
export default function Hero() {
  return (
    <section className="hero shell">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="status-dot" /> TECHNOLOGY WITH PEOPLE AT THE CENTER
        </p>
        <h1>
          Make every
          <br />
          customer
          <br />
          <em>connection</em> count.
        </h1>
        <p className="hero-description">
          Hands-on AI engineering. Connected data. Seamless identity.
          <br className="desktop-break" /> We build the technology and AI
          environments behind better customer experiences.
        </p>
        <div className="actions">
          <Link className="button button-lime" href="/services">
            Explore what we build <Icon name="arrow" size={19} />
          </Link>
          <Link className="text-link" href="/process">
            Our approach <Icon name="external" size={18} />
          </Link>
        </div>
        <div className="hero-footnote">
          <span>INDEPENDENT THINKING.</span>
          <span>CONNECTED SYSTEMS.</span>
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
        <span className="mono">IDEAS IN MOTION / BUN2TOO</span>
      </div>
      {/* <figure className="hero-art hero-art-generated">
        <div className="art-header">
          <span className="status-dot" /> INTELLIGENCE, CONNECTED
        </div>
        <Image
          src="/images/artwork/connected-intelligence.webp"
          alt="Sculptural intelligence core connecting customer data and AI through luminous orbital pathways."
          width={1536}
          height={1024}
          sizes="(max-width:760px) 100vw, 55vw"
          loading="eager"
          fetchPriority="high"
        />
        <figcaption>
          <span>01 / A MORE CONNECTED EXPERIENCE</span>
          <span>BUILT AROUND YOU ↗</span>
        </figcaption>
      </figure> */}
    </section>
  );
}
