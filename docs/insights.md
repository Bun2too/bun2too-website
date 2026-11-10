# Integrated Insights

`/insights` and `/insights/[id]` are server-rendered inside the existing site layout. Set the private `INSIGHTS_API_ORIGIN` through the deployment configuration for builds and runtime. There is no backend default in source. Only public article/feed/push/unsubscribe routes are used; do not add the Marketing API key to this site. The index is rendered at request time using Next.js `connection()`, so a missing build-time setting or transient outage cannot permanently prerender the unavailable screen. Successful API data remains cached for 60 seconds. The current feed exposes up to 100 articles; older articles have individual API lookups. `NEXT_PUBLIC_SITE_URL` sets canonical metadata (default https://bun2too.com).

The same Newsletter component and existing Auth0 signup/preferences API serve contact, insights and the `/insights/signup` embed. The embed permits the selected production Bun2Too framing origins through CSP; other pages remain unframeable. Register actual production hosts with Auth0 and Turnstile. Localhost credentials do not prove production access.

The digest uses the AI & automation consent topic. No password is created during signup; pending records must be verified and confirmed in the account page before delivery. SES and Web Push are implemented in the CrewAI backend; credentials never belong in browser variables. Configure the backend using `crew-team/docs/insights-integration.md`. Push remains unavailable until VAPID is configured. The root service worker handles only push/click events, with no fetch interception. Reading-list state is browser-local and does not sync to Auth0.

Persistent reading status requires explicit optional-preferences consent in the site cookie controls. Until then, the reading list does not read or write its local-storage key; marking read applies to the current view. Withdrawal removes that key without changing email or browser notification subscriptions. See [cookie behavior](legal-and-cookies.md).

Production deployment requires both repositories: deploy the CrewAI API first, then this website. Preserve existing runtime secrets. Verify signup with an authorized test address, complete account verification/consent, then verify SES inbox receipt and one opt-in browser notification before enabling public delivery. No live subscribers were contacted during implementation.

## Connection setup and diagnosis

`INSIGHTS_API_ORIGIN` must be the origin of the working editorial service, without `/insights`, `/api`, quotes or Markdown. Configure it as a Secret in the selected GitHub environment (`main` uses `prod`); the existing deployment sync forwards it into that Netlify project's production configuration. Keep the real hostname out of source and fixture builds. Changing only an ignored local file does not update GitHub or Netlify.

The public read-only contract is:

- `GET /insights/api/articles` → `{ "articles": [...] }`, including IDs, titles, bodies and display metadata.
- `GET /insights/api/articles/{id}` → one public article; 404 means missing.
- `GET /insights/feed.xml` → RSS XML; Atom and push routes retain their existing proxies.

No editorial API key, browser cookie or visitor access token is required or forwarded. Netlify Functions must be allowed to read these public paths through the configured origin's firewall. Server logs distinguish missing/invalid origin configuration, upstream HTTP status and non-JSON responses without printing the origin, response body or unsubscribe query tokens. A login page, bot challenge, redirect or HTML response is not a valid article API response; keep administration endpoints protected independently.

Run `npm run insights:check` to load the ignored local environment and check the index, one article when available, and RSS. It uses only `INSIGHTS_API_ORIGIN`, performs GETs only, prints statuses without the private origin or response bodies, and writes no settings. Deployment configuration now runs the same read-only preflight before changing Netlify settings.

Post-publish smoke checks require an available Insights state, a readable article body when the index has articles, and a working RSS feed. HTTP 200 containing the unavailable screen fails that check. Source changes still need a new deployment; these checks do not repair an incorrect dashboard value automatically.

Routine browser tests use `tests/fixtures/insights.json` through a preload that intercepts only the reserved synthetic editorial origin. Fixture builds and browser-server startup install this mock; ordinary release builds do not. Tests verify server-rendered article cards, local article navigation, body content, canonical metadata and RSS without hitting the live service. A fixture build must never be published.
