import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import EmailButton from "@/components/EmailButton";
import PageArtwork from "@/components/PageArtwork";
export const metadata = pageMetadata("/terms");

export default function TermsPage() {
  return (
    <main id="main-content" className="section shell prose legal-page">
      <StructuredData data={pageSchema("/terms")} />
      <header className="legal-visual-header">
        <div>
          <p className="eyebrow">THE TERMS OF USING BUN2TOO</p>
          <h1 className="page-title">Terms & conditions.</h1>
        </div>
        <PageArtwork name="trust-by-design" compact />
      </header>
      <p className="small">
        Effective: November 8, 2026 · Operator: Bun2too, Inc.
      </p>
      <p>
        These terms govern your use of bun2too.com, including its public pages,
        Insights, account features, and support inquiry tools (the “Site”).
        “Bun2Too,” “we,” and “us” mean Bun2too, Inc.; “you” means the person
        using the Site and any organization they are authorized to represent. By
        using the Site, you agree to these terms. If you do not agree, stop
        using the Site.
      </p>
      <nav className="legal-nav" aria-label="Terms sections">
        <a href="#use">Using the Site</a>
        <a href="#ai">AI & information</a>
        <a href="#liability">Risk & liability</a>
        <a href="#disputes">Law & disputes</a>
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookies">Cookies</Link>
      </nav>

      <h2 id="use">1. Eligibility and accounts</h2>
      <p>
        Account creation and interactive services are intended for people at
        least 18 years old who can enter a binding agreement. If you act for an
        organization, you confirm you have authority to bind it. Provide
        accurate account and contact information, protect your credentials, and
        promptly tell us about suspected unauthorized use. You are responsible
        for activity you authorize through your account, subject to applicable
        law. Do not share another person’s identity or bypass authentication
        controls.
      </p>

      <h2>2. Website information and business engagements</h2>
      <p>
        The Site describes capabilities and illustrative use cases. Statements
        about AI engineering, infrastructure, customer data, identity,
        analytics, consent, and fintech experiments are general information, not
        a promise of a particular result, regulatory status, service level,
        security certification, or delivery schedule. Submitting an inquiry does
        not create a client, fiduciary, advisory, or confidential professional
        relationship.
      </p>
      <p>
        Paid consulting, implementation, hosting, and other business services
        require a separate written agreement. That agreement controls its scope,
        deliverables, fees, intellectual property, confidentiality, data
        processing, warranties, and liability if they conflict with these
        website terms. No purchase or paid engagement is created by using this
        Site.
      </p>

      <h2>3. Permitted use and security</h2>
      <p>
        You may use the Site lawfully to learn about our work and interact with
        the features we make available. Do not use it to infringe rights,
        impersonate others, send spam, upload malware, harass people, commit
        fraud, or violate applicable sanctions or export restrictions. Do not
        probe private systems without authorization, circumvent access or rate
        limits, disrupt availability, extract private records, or use the Site
        to obtain secrets or evade its access controls.
      </p>
      <p>
        Public search engines and AI discovery agents may index public pages in
        accordance with our published crawler rules, reasonable rate limits, and
        applicable law. This permission does not grant access to private
        accounts, private inquiries, internal APIs, or restricted content, or a
        license to republish our entire site or imply our endorsement. Legal
        rights that cannot be restricted by contract remain unaffected.
      </p>

      <h2>4. Site content and intellectual property</h2>
      <p>
        We and our licensors retain rights in our branding, designs, software,
        and original Site content. You receive a limited permission to access
        and use the Site for its intended purposes. Keep attribution and
        ownership notices intact. You may link to public pages and use brief,
        attributed quotations where permitted by law. Broader reproduction,
        commercial redistribution, or use of our trademarks requires permission.
        Third-party names, logos, code, and cited material remain subject to
        their owners’ rights and any applicable licenses. References to
        providers do not imply partnership or endorsement.
      </p>

      <h2>5. Information you submit</h2>
      <p>
        You retain your rights in questions, inquiry messages, and other
        material you submit. You confirm that you have the permissions needed to
        share it and allow us and the service providers involved to process it
        to operate, secure, and respond through the feature you use, as
        described in our <Link href="/privacy">Privacy & consent notice</Link>.
        This permission does not transfer ownership or give us a blanket right
        to sell your submissions or use them to train a general-purpose model.
      </p>
      <p>
        Do not submit passwords, authentication codes, payment credentials,
        confidential client records, sensitive personal data, or information
        requiring special regulatory handling. Public inquiry forms are not
        approved channels for regulated or confidential project data. Agree an
        appropriate secure channel and written protections with us before
        sharing such material.
      </p>

      <h2 id="ai">6. AI-generated editorial material</h2>
      <p>
        Some articles, illustrations, and demonstrations may include
        AI-generated material. Such material and its citations may be
        incomplete, outdated, or inaccurate. Check the original sources before
        relying on a statement. Outputs may resemble other material or be
        subject to third-party rights; we do not guarantee exclusivity or
        ownership of every output.
      </p>
      <p>
        The Site currently does not provide an AI support chat. Editorial
        content and demonstrations cannot bind Bun2Too to contracts, pricing,
        refunds, delivery dates, or legal commitments. Review consequential
        decisions with an appropriately qualified person.
      </p>
      <h2>7. No professional or investment advice</h2>
      <p>
        Articles, demonstrations, stock picks, forecasts, and experiments are
        educational or illustrative. They are not investment recommendations,
        offers to trade securities, or legal, medical, tax, financial, or
        compliance advice. Historical or simulated results do not predict future
        performance. You remain responsible for your decisions and for obtaining
        independent advice appropriate to your situation.
      </p>

      <h2>8. Privacy, cookies, and communications</h2>
      <p>
        Our <Link href="/privacy">privacy notice</Link> and{" "}
        <Link href="/cookies">cookie policy</Link> explain current data
        processing, storage, and choices. Agreeing to these terms does not opt
        you into marketing, optional browser storage, push notifications, or
        inquiry processing. Those choices are separate. Account creation alone
        does not subscribe you to email updates. You may withdraw optional
        consent through the relevant controls without accepting optional cookies
        to browse public pages.
      </p>

      <h2>9. Third-party services and links</h2>
      <p>
        Authentication, hosting, AI responses, editorial content, and other
        features depend on providers and linked sources. When you visit or use a
        provider’s service, its applicable terms and notices also apply. We do
        not control external sites or guarantee their accuracy, continued
        availability, security, or suitability. An external link does not
        transfer responsibility for a third party’s independent conduct to
        Bun2Too. This does not exclude responsibilities that applicable law
        places on us.
      </p>

      <h2>10. Availability, changes, and suspension</h2>
      <p>
        We may update or discontinue free Site features and apply reasonable
        usage limits. We may restrict access to address misuse, a security
        incident, legal requirements, or material breach. Where practicable and
        appropriate, we will explain a restriction and provide a way to contact
        us; urgent security or legal action may require acting first. No uptime,
        response-time, backup, or support-service commitment is created by these
        website terms. Obligations under a separate signed agreement remain
        governed by that agreement.
      </p>

      <h2 id="liability">11. Warranty disclaimer</h2>
      <p>
        <strong>
          To the extent permitted by law, the Site and its information,
          demonstrations, and AI responses are provided as available, without
          contractual warranties of accuracy, uninterrupted operation, fitness
          for a particular purpose, merchantability, or non-infringement.
        </strong>{" "}
        We do not promise that a demonstration will suit your production
        environment or that the Site will be free of errors or vulnerabilities.
        Any warranties or consumer protections that cannot lawfully be excluded
        remain in effect.
      </p>

      <h2>12. Limits of liability</h2>
      <p>
        <strong>
          To the fullest extent permitted by applicable law, Bun2too, Inc. and
          its officers, employees, and agents will not be liable under these
          website terms for indirect or consequential loss, lost profits, lost
          business opportunities, or loss of data arising from your use of the
          free Site. Our combined total liability for claims arising from the
          free Site or these terms is limited to US $100.
        </strong>{" "}
        These limits apply regardless of the legal theory and only where legally
        enforceable.
      </p>
      <p>
        These exclusions and limits do not apply to fraud, willful misconduct,
        gross negligence, death or personal injury caused by negligence, or any
        liability or remedy that cannot lawfully be excluded or limited.
        Separate signed service agreements govern liability for paid
        engagements. Nothing here removes mandatory consumer rights or other
        non-waivable statutory protections.
      </p>

      <h2>13. Business-user indemnity</h2>
      <p>
        If you use the Site on behalf of a business, that business agrees, where
        permitted by law, to indemnify Bun2too, Inc. for third-party claims and
        reasonable related costs to the extent caused by its unlawful use,
        material breach of these terms, or submitted content that infringes
        another person’s rights. This obligation does not cover loss caused by
        our own breach, negligence, or misconduct. We will promptly notify you
        of a claim, allow reasonable participation in its defense, and will not
        agree to a settlement imposing an admission or non-monetary obligation
        on you without your consent. This section does not impose an indemnity
        on consumers using the Site personally.
      </p>

      <h2 id="disputes">14. Governing law and disputes</h2>
      <p>
        Texas law governs these terms, excluding its choice-of-law rules, except
        where mandatory law requires otherwise. Subject to any non-waivable
        right to bring a claim elsewhere, disputes will be brought in the state
        courts in Collin County, Texas, or the federal courts serving that
        county where federal jurisdiction exists. Each party consents to those
        courts’ jurisdiction. Mandatory protections in your place of residence
        continue to apply when required by law.
      </p>
      <p>
        Please <Link href="/contact">contact us</Link> first so we can try to
        resolve a concern. This request does not delay a filing deadline,
        prevent urgent relief, or require arbitration. These terms do not impose
        a class-action waiver.
      </p>

      <h2>15. Updates and general provisions</h2>
      <p>
        We will publish updated terms with a new effective date. For material
        changes, we will provide reasonable advance notice on the Site or
        through an appropriate contact channel where practicable; urgent legal
        or security changes may take effect sooner. Changes apply prospectively,
        subject to any acceptance required by law. If you disagree with revised
        terms, stop using the affected features. Keeping a dated copy is
        recommended.
      </p>
      <p>
        If a provision cannot be enforced, the remaining provisions continue
        where legally possible. A delay in enforcement is not a waiver. You may
        not transfer your obligations without our consent, except where the law
        allows it. We may transfer these terms with a lawful business succession
        without reducing mandatory protections. These terms concern the Site and
        do not replace a signed services agreement or any rights that cannot be
        waived.
      </p>

      <h2>16. Contact Bun2too, Inc.</h2>
      <p>
        Legal and privacy questions: <EmailButton email={site.legalEmail} />.
      </p>
      <p>
        For terms, privacy, intellectual-property concerns, or a request for an
        appropriate legal contact channel, use our{" "}
        <Link href="/contact">contact page</Link> and identify your request
        clearly. Do not include confidential documents in an initial public-site
        inquiry. Website support is not an agent for formal service of legal
        process unless separately authorized by law.
      </p>
    </main>
  );
}
