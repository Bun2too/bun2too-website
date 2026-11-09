# Customer support and private inquiries

The website currently provides an indexable `/support` FAQ page and a lazy-loaded **Contact Bun2Too** inquiry dialog. The dialog opens from the floating launcher, `/support`, or `/contact`, and stays hidden on embedded signup. There is no AI chat endpoint, model request, document search, or transcript attachment in the current site.

Open WebUI is the intended future AI platform. No Open WebUI API, model, credentials, knowledge collection, or website connection is configured by this change. Add a separately scoped server-side integration only when its authentication, public knowledge boundary, data handling, and retention have been defined. Do not present a planned assistant as live or add backend URLs/credentials to this public repository.

## Configuration

Private inquiries require Netlify hosting/storage, `SUPPORT_SESSION_SECRET` (at least 32 random characters), and the existing Turnstile public/secret key pair for production verification. They have no AI-provider dependency. See the exact per-environment inventory in [security](security.md) and [setup](setup.md).

`GET /api/support/session` initializes a signed HttpOnly visitor cookie and reports inquiry availability. It never returns stored inquiries or credentials. `POST /api/support/inquiries` validates origin, consent, field bounds, request ID, honeypot, CAPTCHA, and distributed limits before writing to private storage. No public inbox, generic blob listing, or inquiry retrieval API exists.

## Collection and ownership

Netlify Blobs store `bun2too-support` is site-wide, so records survive deployments. Separate dev/QA/prod sites isolate their data. Netlify supplies runtime storage credentials; no public blob token is needed.

Authorized administrators can view records under `inquiries/` in **Netlify → site → Data & Storage → Blobs**. New records contain a reference, name, contact email, topic, inquiry message, consent purpose/version/time, creation/expiry timestamps, and `new` status. They do not contain chat transcripts or external AI session IDs. Contact emails are self-reported and do not establish account ownership.

The visitor cookie expires after 24 hours. HMAC-derived ownership and request IDs isolate retries and make successful repeated submissions idempotent. Pseudonymous rate counters under `limits/` use conditional writes; raw network addresses are not stored. Inquiry consent is independent of newsletter enrollment. Collection does not automatically notify a helpdesk or send campaign email; administrators review the private store and respond through their chosen process.

## Retention and retiring the previous provider

New inquiries become eligible for deletion after 90 days. The scheduled `netlify/functions/support-retention.mts` removes expired inquiries, limits, and legacy `conversations/` records daily at 04:00 UTC. Legacy cleanup remains so removing chat does not strand existing records; it creates no new conversations and calls no AI service. Existing inquiry attachments, if any, retain their original expiry. This source change does not delete historical data immediately or alter records held by an external service.

The old chat-provider settings have been removed from source, workflows, deployment validation, and local environment files. If older deployments were configured, remove their obsolete provider-prefixed secrets/settings from every GitHub environment and Netlify site, revoke retired service credentials, and handle that service's stored data according to your retention obligations. Keep `SUPPORT_SESSION_SECRET`, storage, and Turnstile configuration for private inquiries. Remote dashboards/service installations are not changed by editing this repository.

## Verification

Use isolated unit/browser fixtures for routine development. Checks cover consent and bounded input, signed cookies, ownership/idempotency, rate limits, failures without false receipts, and the absence of chat requests/transcript fields. Tests also verify the removed chat endpoint is unavailable. Build and Netlify adapter packaging still require server APIs and scheduled cleanup; static export is not sufficient.

After deploying with authorized configuration, submit one approved test inquiry, verify its reference privately in Netlify, check failure/verification states, and confirm the retention schedule. Do not use customer data or trigger real inquiry writes without an appropriate test environment and authorization. These checks do not provision the future AI platform.
