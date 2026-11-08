import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Articles from "@/components/Articles";
import CTA from "@/components/CTA";
import Newsletter from "@/components/Newsletter";
import Link from "next/link";
import Icon from "@/components/Icon";
export const metadata = pageMetadata("/");
export default function Home() {
  return (
    <main id="main-content">
      <StructuredData data={pageSchema("/")} />
      <Hero />
      <div className="focus-strip">
        <div className="shell">
          <span>BUILT TO ENABLE YOUR BUSINESS</span>
          <span>AI engineering</span>
          <span>AI infrastructure</span>
          <span>Data & integration</span>
          <span>Identity & consent</span>
          <span>Analytics & AI</span>
        </div>
      </div>
      <Services />
      <section className="approach-teaser shell">
        <p className="eyebrow">CONNECTED THINKING, FROM DAY ONE</p>
        <h2>
          A collection of tools
          <br />
          isn’t a <em>connected experience.</em>
        </h2>
        <div>
          <p>
            We look at the whole journey: how data moves, how people sign in,
            and how their choices are respected. Then we build the connections
            that make it work.
          </p>
          <Link href="/process" className="text-link">
            See how we work <Icon name="arrow" size={20} />
          </Link>
        </div>
      </section>
      <Articles />
      <Newsletter />
      <CTA />
    </main>
  );
}
