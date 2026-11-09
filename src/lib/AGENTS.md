# Shared logic and integration guidance

Read the root guide and `../../docs/architecture.md`. Public content, browser-safe configuration, and server integration logic have different consumers.

- `site.ts`: shared capabilities/process/destinations. Keep explicit service slugs stable and unique. `seo.ts`: canonical metadata, indexing decisions, and truthful schema. `support-content.ts`: public FAQ answers also used by `/llms.txt`.
- `auth-config.ts` is public SPA configuration. `auth0-server.ts` owns private Management access and token validation. Preserve issuer/audience/client/scope/expiry checks and the distinction between ID/access tokens.
- Deployment values have no operational source defaults. Read `../../docs/security.md`; public provider IDs must be environment-supplied even though they remain observable in browser use. `insights-origin.ts` / `insights-proxy.ts` keep the configured editorial origin server-side and expose only fixed public routes. Never replace them with an external client-visible rewrite.
- `consent.ts` and `subscriptions.ts` implement pending/verified/withdrawn subscription behavior. Anonymous duplicates cannot overwrite another person's choices; preserve unrelated app metadata.
- `cookie-consent.ts` is browser-safe, versioned optional-storage policy, separate from newsletter consent. Invalid/expired records deny optional access. `site.ts` holds the confirmed public legal entity/email; legal drafting/review and storage inventory are documented in `../../docs/legal-and-cookies.md`.
- `support.ts`, `support-api.ts`, and `support-store.ts` own signed visitor identity, ownership/idempotency, conditional-write limits, private inquiry data, and consent/expiry. No AI-provider request or chat attachment is part of this flow. Never use email as proof of account ownership.
- `insights.ts` uses the public editorial API and cache policy. Keep missing and unavailable articles distinct. No marketing administration credentials belong here.
- Do not import Node/server implementation modules into client components as runtime values. Type-only imports may be erased, but check the actual import boundary. Keep external errors and secrets out of public responses/logs.
