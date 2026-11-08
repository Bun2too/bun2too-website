import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieConsent";
import { site } from "@/lib/site";
import EmailButton from "@/components/EmailButton";
import PageArtwork from "@/components/PageArtwork";
export const metadata = pageMetadata("/privacy");
export default function PrivacyPage() {
  return (
    <main id="main-content" className="section shell prose legal-page">
      <StructuredData data={pageSchema("/privacy")} />
      <header className="legal-visual-header">
        <div>
          <p className="eyebrow">YOUR DATA, YOUR CHOICE</p>
          <h1 className="page-title">Privacy & consent.</h1>
        </div>
        <PageArtwork name="trust-by-design" compact />
      </header>
      <p>
        This website is operated by Bun2too, Inc. See our{" "}
        <Link href="/terms">Terms & conditions</Link> and{" "}
        <Link href="/cookies">cookie policy</Link>.
      </p>
      <p>
        When you sign in, Auth0 manages your identity. Bun2Too uses your
        identity profile to display your account and manage the choices you make
        on this website.
      </p>
      <h2>Email subscriptions</h2>
      <p>
        When you request email updates, we store your email address, selected
        topics, the time and source of your request, and the version of the
        consent wording in Auth0. No password is created for an email-only
        subscriber. A request stays pending until you verify your email and
        confirm your choices in your account. Creating an account does not
        automatically subscribe you.
      </p>
      <h2>Change your choices</h2>
      <p>
        Sign in to your account to confirm, update, or withdraw your email
        subscription. Withdrawing your subscription stops future marketing
        eligibility; it does not delete your identity account. Separate Auth0
        identities are not automatically merged just because they share an email
        address. Use the passwordless email sign-in option to manage an
        email-only subscription.
      </p>
      <h2>Storage and service providers</h2>
      <p>
        Auth0 stores identity and subscription preferences. Netlify hosts this
        website. Cloudflare Turnstile verifies public signup requests to help
        prevent automated abuse and may process browser and network signals for
        that purpose. See the{" "}
        <a href="https://www.cloudflare.com/turnstile-privacy-policy/">
          Turnstile privacy addendum
        </a>
        . Essential authentication cookies and session storage may be used to
        complete sign-in. Google Tag Manager loads Google Analytics for
        public-site measurement only with Analytics consent. Advertising-related
        consent signals require a separate Marketing choice as well. No
        standalone advertising pixel is installed. Google may process device,
        network, and usage data under its{" "}
        <a href="https://policies.google.com/privacy">privacy policy</a>.
        Insights articles are displayed within this site using our public
        editorial backend. Feed, unsubscribe, and optional push registration
        requests are handled by that editorial service.
      </p>
      <h2>Cookies and browser preferences</h2>
      <p>
        Necessary storage supports requested authentication, security, support,
        and remembering your cookie choices. Optional preferences start off and
        let Insights remember read articles on this device. Withdrawing that
        permission removes saved reading status. Analytics and Marketing are
        separate optional choices, off by default. Withdrawing them clears
        accessible matching Google cookies and may reload the page to stop
        loaded tags. Cookie choices do not change authentication or support
        data. Choose <CookieSettingsButton />
        here or in the footer; the <Link href="/cookies">cookie policy</Link>
        lists storage purposes and durations. These choices do not change email
        subscriptions or browser notification permissions, which require their
        own opt-ins.
      </p>
      <h2>Support conversations and inquiries</h2>
      <p>
        When you start a support chat, Bun2Too sends the messages you choose to
        share to our Onyx knowledge service and its configured model provider to
        retrieve relevant knowledge and generate an answer. The assistant is
        limited to an approved public support knowledge set. AI responses can be
        mistaken. Do not include passwords, authentication codes, payment
        details, or other sensitive information.
      </p>
      <p>
        After you open support, an essential, signed, HTTP-only cookie
        identifies your browser for up to 24 hours and keeps your conversation
        separate from other visitors. We store support chat state privately in
        Netlify for up to 24 hours before it becomes eligible for automatic
        cleanup. Onyx also stores its chat history under its own
        administrator-configured retention policy; deleting website chat state
        does not itself delete Onyx history.
      </p>
      <p>
        When you send a private inquiry, we store your name, contact email,
        topic, message, and consent timestamp in Netlify. We attach the chat
        transcript only if you explicitly choose to include it. Inquiry records
        become eligible for cleanup after 90 days; scheduled cleanup runs daily.
        A pseudonymous rate-limit identifier may be derived from the hosting
        platform’s connection address to reduce abuse. Sending an inquiry does
        not subscribe you to marketing.
      </p>
      <h2>Retention and questions</h2>
      <p>
        Identity and subscription records remain until removed by Bun2Too’s
        tenant administrators or through an applicable deletion request. For
        questions or to request access or deletion, email{" "}
        <EmailButton email={site.legalEmail} /> or use our{" "}
        <Link href="/contact">contact page</Link>. This page describes the
        current website implementation; it is not a statement that all future
        services share these practices.
      </p>
      <p className="small">
        Notice updated: November 8, 2026. Email and support consent wording
        version: 2026-11-07.
      </p>
    </main>
  );
}
