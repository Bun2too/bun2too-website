import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { CookieSettingsButton } from "@/components/CookieConsent";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import EmailButton from "@/components/EmailButton";
import PageArtwork from "@/components/PageArtwork";
export const metadata = pageMetadata("/cookies");

export default function CookiesPage() {
  return (
    <main id="main-content" className="section shell prose legal-page">
      <StructuredData data={pageSchema("/cookies")} />
      <header className="legal-visual-header">
        <div>
          <p className="eyebrow">YOUR DEVICE. YOUR CHOICE.</p>
          <h1 className="page-title">Cookies, with clarity.</h1>
        </div>
        <PageArtwork name="trust-by-design" compact />
      </header>
      <p>
        Bun2too, Inc. uses cookies and similar browser storage to operate
        requested features and, with your permission, remember your Insights
        reading status and measure public-site use. Optional categories start
        off. Our configured Google Tag Manager container loads Google Analytics
        only after you enable Analytics. Advertising-related storage and
        personalization require the separate Marketing choice as well. No
        standalone advertising pixel is currently installed.
      </p>
      <div className="legal-nav">
        <CookieSettingsButton />
        <Link href="/privacy">Privacy & consent</Link>
        <Link href="/terms">Terms & conditions</Link>
      </div>
      <h2>Choose what stays on your device</h2>
      <p>
        <strong>Necessary:</strong> remember cookie choices and support sign-in,
        security, and support conversations you request. These cannot be
        switched off through our preference controls. You can block storage in
        your browser, but sign-in or support may stop working.
      </p>
      <p>
        <strong>Preferences:</strong> optionally remember articles marked as
        read in Insights. With preferences off, reading status lasts only for
        the current view. Turning preferences off removes the saved reading list
        from this origin.
      </p>
      <p>
        <strong>Analytics:</strong> optionally load Google Tag Manager and
        Google Analytics to understand use of public pages. Necessary-only and
        preferences-only choices do not load Google tags or send measurement
        requests from this integration. Account pages, signup embeds, and
        initial URLs containing query strings or fragments do not initialize the
        container.
      </p>
      <p>
        <strong>Marketing:</strong> optionally allow advertising-related
        storage, advertising user data, and personalization in supported Google
        tags. These Google consent signals remain denied unless both Analytics
        and Marketing are enabled. Marketing alone does not load the container.
        Choosing Analytics does not automatically enable Marketing, email
        subscriptions, or browser notifications.
      </p>
      <h2>Storage used by this site</h2>
      <div
        className="cookie-table-wrap"
        role="region"
        aria-label="Cookie and browser storage inventory"
        tabIndex={0}
      >
        <table className="cookie-table">
          <caption>Current website storage and its purpose</caption>
          <thead>
            <tr>
              <th scope="col">Storage / provider</th>
              <th scope="col">Purpose & category</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                _ga / _ga_*
                <br />
                Google Analytics
              </th>
              <td>
                Optional Analytics. Browser identifiers and measurement session
                state may be set by the configured GA4 tag. Only loaded with
                Analytics permission.
              </td>
              <td>
                Google’s default can be up to 2 years, subject to container
                configuration and browser limits. Accessible matching cookies
                are removed when Analytics is withdrawn.
              </td>
            </tr>
            <tr>
              <th scope="row">
                _gcl_* / _gac_*
                <br />
                Google advertising-related tags, if configured
              </th>
              <td>
                Optional Marketing, also requiring Analytics.
                Advertising/conversion storage may be used by supported
                configured Google tags. These names describe conditional
                storage, not a claim that a separate advertising pixel is
                installed.
              </td>
              <td>
                Provider/configuration dependent. Accessible matching cookies
                are removed on withdrawal.
              </td>
            </tr>
            <tr>
              <th scope="row">
                bun2too_cookie_consent
                <br />
                Bun2Too cookie
              </th>
              <td>
                Necessary. Stores the policy version, category choices, and
                timestamps; contains no email or account ID.
              </td>
              <td>180 days from saving your choice.</td>
            </tr>
            <tr>
              <th scope="row">
                bun2too-read-insights
                <br />
                Bun2Too local storage
              </th>
              <td>
                Optional preferences. Stores article IDs marked as read;
                accessed only with permission.
              </td>
              <td>
                Until preferences are withdrawn, browser storage is cleared, or
                consent expires and you next visit the site. No independent
                browser expiry.
              </td>
            </tr>
            <tr>
              <th scope="row">
                bun2too_support
                <br />
                Bun2Too HttpOnly cookie
              </th>
              <td>
                Necessary when you open support. Signed visitor identifier
                isolates conversations and inquiry ownership.
              </td>
              <td>Up to 24 hours.</td>
            </tr>
            <tr>
              <th scope="row">
                auth0.*.is.authenticated / auth0.*.organization_hint
                <br />
                Auth0 SDK cookies, including compatibility variants where
                applicable
              </th>
              <td>
                Necessary for requested authentication. Remember sign-in or
                organization hints. Access tokens stay in SDK memory.
              </td>
              <td>
                Normally 1 day with the current SDK configuration; cleared by
                logout where applicable.
              </td>
            </tr>
            <tr>
              <th scope="row">
                a0.spajs.txs.*
                <br />
                Auth0 SDK session storage
              </th>
              <td>
                Necessary for a requested login transaction, including state and
                PKCE verification.
              </td>
              <td>
                Removed when the transaction completes or the browser session
                ends.
              </td>
            </tr>
            <tr>
              <th scope="row">
                Auth0-hosted login / hosting security providers
              </th>
              <td>
                Necessary service-side session, security, or infrastructure
                storage may apply when a feature is used. Provider-domain
                storage is controlled by the provider.
              </td>
              <td>
                Varies by provider configuration and session. See{" "}
                <a href="https://auth0.com/docs/manage-users/cookies">
                  Auth0’s cookie documentation
                </a>
                .
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Security and separate opt-ins</h2>
      <p>
        If Cloudflare Turnstile is configured, signup forms load its anti-abuse
        check. It processes browser and network signals for security; it is not
        a marketing integration. See{" "}
        <a href="https://www.cloudflare.com/turnstile-privacy-policy/">
          Turnstile privacy information
        </a>
        .
      </p>
      <p>
        Browser notifications require a separate action and browser permission.
        If enabled, the service worker and push subscription persist until you
        turn notifications off or clear/revoke them in your browser. Cookie
        preferences do not unsubscribe notifications or email. Newsletter
        subscription, account creation, support inquiry consent, and cookie
        choices are independent.
      </p>
      <h2>Change or withdraw permission</h2>
      <p>
        Use <CookieSettingsButton /> here or in any page footer. “Necessary
        only” withdraws optional permission and deletes our saved reading-list
        key and accessible matching Google cookies. When previously loaded tags
        need to be stopped, the page reloads after saving your new choice to
        unload their runtime. It does not log you out, erase support messages,
        or remove provider-domain cookies. Manage those in the relevant account,
        browser, or provider settings.
      </p>
      <p>
        Your choice applies to this browser and website origin, not every device
        or subdomain. We ask again when the choice expires, the policy version
        changes, or storage is cleared. If your browser prevents saving the
        choice, we tell you and may ask again. No optional storage is enabled
        just by browsing, closing preferences, or accepting the site terms.
      </p>
      <p>
        Google may process browser, device, network, page, and measurement data
        under its{" "}
        <a href="https://policies.google.com/privacy">privacy policy</a>. The
        website does not send account IDs, support messages, inquiry fields, or
        email subscription data to the data layer. Container administrators must
        keep tags and consent requirements aligned with this policy.
      </p>
      <p>
        Questions? Email <EmailButton email={site.legalEmail} /> or{" "}
        <Link href="/contact">contact Bun2too, Inc.</Link>
      </p>
      <p className="small">Last updated: November 8, 2026.</p>
    </main>
  );
}
