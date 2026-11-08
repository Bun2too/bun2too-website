import Icon from "./Icon";
import { site } from "@/lib/site";
export default function Articles() {
  return (
    <section className="articles-section shell">
      {/* <div className="article-art" aria-hidden="true">
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
      </div> */}
      <div className="articles-copy">
        <p className="eyebrow">THE BUN2TOO NOTEBOOK</p>
        <h2>
          Curiosity is
          <br />
          part of the process.
        </h2>
        <p>
          Explore the Bun2Too article hub for ideas and experiments from our
          wider work in technology and AI.
        </p>
        <a
          className="button button-cream"
          href={site.articles}
        >
          Read our articles <Icon name="external" size={20} />
        </a>
        <p className="small">Published here on Bun2Too</p>
      </div>
    </section>
  );
}
