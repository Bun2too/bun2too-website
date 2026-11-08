import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import SupportOpenButton from "@/components/support/SupportOpenButton";
import { site } from "@/lib/site";
import EmailButton from "@/components/EmailButton";
import { PageHero } from "@/components/PageArtwork";
export const metadata = pageMetadata("/contact");
export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || site.legalEmail;
  return (
    <main id="main-content">
      <StructuredData data={pageSchema("/contact")} />
      <PageHero artwork="human-connection" className="page-header shell">
        <p className="eyebrow">A GOOD PLACE TO START</p>
        <h1 className="page-title">
          What could we
          <br />
          <em>connect for you?</em>
        </h1>
        <p className="page-intro">
          Tell us about the systems you use, the customer experience you want,
          and what’s getting in the way.
        </p>
        <div className="actions">
          <SupportOpenButton inquiry>
            Send a private inquiry ↗
          </SupportOpenButton>
          <EmailButton className="button button-outline" email={email}>
            Email Bun2Too ↗
          </EmailButton>
        </div>
        <p className="small" style={{ marginTop: 24 }}>
          Explore our <Link href="/process">process</Link> before you get
          started, or <Link href="/account">manage your account</Link>.
        </p>
      </PageHero>
      <section
        className="shell contact-detail-strip"
        aria-label="Ways we can help"
      >
        <span>AI engineering & infrastructure</span>
        <span>Customer data & identity</span>
        <span>Analytics, automation & consent</span>
      </section>
      <Newsletter />
    </main>
  );
}
