import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import SupportOpenButton from "@/components/support/SupportOpenButton";
import { absoluteUrl, pageMetadata, pageSchema } from "@/lib/seo";
import { supportFaqs } from "@/lib/support-content";
import { PageHero } from "@/components/PageArtwork";
export const metadata = pageMetadata("/support");
export default function SupportPage() {
  return (
    <main id="main-content" className="section shell">
      <StructuredData data={pageSchema("/support")} />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": absoluteUrl("/support#questions"),
          mainEntity: supportFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <PageHero artwork="human-connection" className="support-visual-header">
        <p className="eyebrow">A LITTLE HELP, BETTER CONNECTED</p>
        <h1 className="page-title">
          Good questions.
          <br />
          <em>A place to start.</em>
        </h1>
        <p className="page-intro">
          Get help with Bun2Too’s customer technology, applications, accounts,
          and website. Explore common questions or send the team a private
          inquiry.
        </p>
        <div className="actions">
          <SupportOpenButton>Send a private inquiry ↗</SupportOpenButton>
        </div>
        <p className="support-intro-note">
          Your inquiry goes to the Bun2Too team. We use the contact details you
          provide to respond.{" "}
          <Link href="/privacy" className="text-link">
            Privacy & consent ↗
          </Link>
        </p>
      </PageHero>
      <section className="support-faqs" aria-label="Frequently asked questions">
        {supportFaqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
            <Link href={faq.path}>Learn more ↗</Link>
          </details>
        ))}
      </section>
    </main>
  );
}
