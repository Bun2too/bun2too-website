# Integrated Insights

`/insights` and `/insights/[id]` are server-rendered inside the existing site layout. Set the private `INSIGHTS_API_ORIGIN` through the deployment configuration for builds and runtime. There is no backend default in source. Only public article/feed/push/unsubscribe routes are used; do not add the Marketing API key to this site. The current 100-article feed is cached for 60 seconds; older articles have individual API lookups. `NEXT_PUBLIC_SITE_URL` sets canonical metadata (default https://bun2too.com).

The same Newsletter component and existing Auth0 signup/preferences API serve contact, insights and the `/insights/signup` embed. The embed permits the selected production Bun2Too framing origins through CSP; other pages remain unframeable. Register actual production hosts with Auth0 and Turnstile. Localhost credentials do not prove production access.

The digest uses the AI & automation consent topic. No password is created during signup; pending records must be verified and confirmed in the account page before delivery. SES and Web Push are implemented in the CrewAI backend; credentials never belong in browser variables. Configure the backend using `crew-team/docs/insights-integration.md`. Push remains unavailable until VAPID is configured. The root service worker handles only push/click events, with no fetch interception. Reading-list state is browser-local and does not sync to Auth0.

Persistent reading status requires explicit optional-preferences consent in the site cookie controls. Until then, the reading list does not read or write its local-storage key; marking read applies to the current view. Withdrawal removes that key without changing email or browser notification subscriptions. See [cookie behavior](legal-and-cookies.md).

Production deployment requires both repositories: deploy the CrewAI API first, then this website. Preserve existing runtime secrets. Verify signup with an authorized test address, complete account verification/consent, then verify SES inbox receipt and one opt-in browser notification before enabling public delivery. No live subscribers were contacted during implementation.
