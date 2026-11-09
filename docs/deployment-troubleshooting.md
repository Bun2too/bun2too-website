# Deployment and form connection troubleshooting

The deployment branch selects the GitHub environment: `dev → dev`, `qa → qa`, `main → prod`. Check **Settings → Environments → selected environment**, not only repository-level settings. Environment settings can override repository values. A failed validation/sync does not publish a new deployment; the existing website keeps its previously built configuration.

## Auth0 audience mismatch

The preference API's audience is the exact **Identifier** of your custom Auth0 API (Applications → APIs), including any trailing slash. It is not the SPA client ID and is not the Auth0 Management API identifier.

Set the GitHub environment **Variable `NEXT_PUBLIC_AUTH0_AUDIENCE`** to that Identifier. CI now uses this single value both for browser token requests and server `AUTH0_AUDIENCE`, eliminating drift from the older duplicate Secret. The old GitHub `AUTH0_AUDIENCE` Secret is unused and can be removed. In an ignored local environment file, both names still need the same exact value. Validation reports setting names and whitespace problems without printing values.

Similarly, `AUTH0_DOMAIN` (Secret) and `NEXT_PUBLIC_AUTH0_DOMAIN` (Variable) must identify the same tenant hostname. `NEXT_PUBLIC_AUTH0_CLIENT_ID` is the **SPA** application's ID; the Management ID/secret belong to a **separate M2M** application. Follow [Auth0 setup](setup.md) for callback URLs, origins, passwordless email, API scope and provider templates.

## What the pipeline verifies

1. Validate all required configuration and cross-setting consistency before changing Netlify.
2. Request a Management API token with the configured M2M credentials and required scopes. This creates no users, reads no customer profiles and sends no email. A failure reports HTTP status and corrective setting names; provider bodies/tokens are withheld.
3. Confirm the selected Netlify site matches `NEXT_PUBLIC_SITE_URL`, then sync named production-context values. Logs show progress by key name only. A failed sync stops publication, although earlier keys in that sync may already have been updated.
4. Build with the Netlify adapter, then check that release browser JavaScript contains the expected public Auth0, Turnstile and tracking settings. A successful fixture build cannot substitute for this release build.
5. Publish, check real routes and invalid/unauthorized API inputs, then check runtime inquiry readiness (and AI readiness if enabled). Readiness means configuration/context is present, not that a valid customer transaction has completed.

Public `NEXT_PUBLIC_*` settings are frozen into browser JavaScript during a Next.js build. Updating a Netlify runtime variable cannot repair an old browser bundle. Commit/push the fix or trigger a new build on the correct branch after correcting dashboard settings. Rerunning an old workflow run uses that old commit. GitHub debug logging will still mask secret values; it cannot fix inconsistent or absent settings. Normal logs now include safe diagnostics, so enabling debug is unnecessary.

## Feature checks

| Feature / symptom | Check and action |
| --- | --- |
| Account link instead of Log in; “Sign-in is being connected” | Set the environment's `NEXT_PUBLIC_AUTH0_DOMAIN` and `NEXT_PUBLIC_AUTH0_CLIENT_ID` Variables, then rebuild. These public settings must be in the actual release build. |
| Auth0 redirect starts but login fails | Allow the exact website origin/root callback and logout URL in the SPA application. Enable its intended connections. Check custom API audience/scope and sign in again after changes. |
| Newsletter verification never loads | Pair the Turnstile public site-key Variable and private secret. Allow every deployed hostname in the widget. Browser/content-blocking failures now display guidance; CAPTCHA is never bypassed. |
| Newsletter API returns unavailable | Check Management M2M authorization/scopes and the passwordless `email` connection's enabled clients. Auth0 handles its configured email verification delivery; this website does not deliver campaigns. |
| Newsletter request accepted but not active | Expected: sign in through **Continue with email**, verify the same passwordless identity, and explicitly confirm topics in `/account`. A signup request alone is pending, not subscribed. |
| Inquiry collection unavailable | Set a random `SUPPORT_SESSION_SECRET` of at least 32 characters and both Turnstile keys. Use Netlify Functions/Next adapter with Blobs runtime context; static upload is insufficient. |
| Inquiry saved but no notification email | Expected: the reference confirms private Netlify storage, not email delivery. Administrators review `bun2too-support/inquiries/` and respond; no helpdesk notification integration is implemented. |
| AI answer controls absent/unavailable | Complete [Open WebUI setup](support.md), including dedicated public-only access, all four Secrets and explicit enable Variable. There is no implicit connection to a host just because DNS exists. |
| Cookie settings seem unresponsive | They require JavaScript but no Auth0/API credential. Check console and `/_next/static/` responses; test a fresh browser profile. A saved choice hides the initial banner; footer **Cookie settings** reopens it. Choices are per browser/origin. |
| Analytics has no events | Explicit Analytics consent is required; necessary-only intentionally leaves Google unloaded. Verify the published GTM container/GA4 destination and allow them in the browser. Cookie acceptance does not subscribe email. |

## Local and live verification limits

`npm test`, `npm run docs:check`, `npm run typecheck`, isolated `npm run build:test` and `npm run test:e2e` use fixtures; they cannot prove your provider dashboard settings or customer delivery. `npm run deploy:check` validates runner environment configuration without synchronizing or contacting providers. For an ignored local file, use `node --env-file=.env.local scripts/sync-netlify-env.mjs --check`; required deploy credentials still need to exist, and no values are printed. Do not run the mutating sync against a live site just to inspect local setup.

After deployment, use an approved test identity/inquiry in dev to verify actual authentication, email verification, topic activation/withdrawal and private record persistence. Ask a public AI test question only when enabled. Do not publish tokens, raw provider errors, environment files, customer data or screenshots of credentials while debugging. See [security inventory](security.md).
