import Link from "next/link";
import Icon from "./Icon";
import PageArtwork from "./PageArtwork";
export default function CTA() {
  return (
    <section className="cta-section shell">
      <div className="cta-visual">
        <PageArtwork name="human-connection" eager={false} />
      </div>
      <div>
        <p className="eyebrow">LET’S CONNECT THE DOTS</p>
        <h2>
          Your next chapter.
          <br />
          <em>Better connected.</em>
        </h2>
      </div>
      <div>
        <p>
          Have an AI application, infrastructure, or customer technology
          challenge? Tell us where you want to go.
        </p>
        <Link href="/contact" className="button button-lime">
          Start a conversation <Icon name="arrow" size={20} />
        </Link>
      </div>
    </section>
  );
}
