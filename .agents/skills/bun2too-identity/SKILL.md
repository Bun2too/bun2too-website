---
name: bun2too-identity
description: Update or troubleshoot Bun2Too Auth0 React login, passwordless subscriber provisioning, newsletter consent, account preferences, or access-token validation. Do not use for unrelated marketing copy.
---

# Bun2Too identity and consent

Read [root guidance](../../../AGENTS.md), [identity/deployment setup](../../../docs/setup.md), and, for original SDK requirements, the [preserved Auth0 brief](../../../docs/reference/auth0-sdk-brief.md). This is an existing Next.js app, so historical sample-app instructions are contextual rather than a request to clone a replacement.

## Integration boundaries

Client login/signup/logout/profile use the official Auth0 React SDK. Initialization occurs after mounting; browser objects stay in client effects or event handlers. Tokens stay in SDK memory. Public SPA configuration is in `src/lib/auth-config.ts`; private Management credentials remain server-only in `auth0-server.ts`.

`POST /api/subscriptions` records an explicit request as a pending, unverified passwordless email identity. Anonymous duplicates cannot overwrite preferences or reactivate withdrawal. Do not create fake passwords, mark email verified without provider proof, or merge identities by email.

`GET/PATCH /api/preferences` validates issuer, audience, SPA client, scope, expiry, and subject; activation additionally requires a provider-verified email. Preserve unrelated app metadata. Consent is unchecked and separate from account creation and private support inquiries.

## Change and validate

Keep shared newsletter/embed behavior and account UI consistent with the server contract. Preserve same-origin/input limits, CAPTCHA checks, and truthful error states. Use the existing API/subscription tests and relevant browser checks. Real user provisioning, sign-in, or campaign delivery needs an authorized test environment and task scope; mocked redirects do not prove tenant callbacks are configured.

Update the architecture/privacy/setup documentation if a state transition, environment variable, or data-handling behavior changes. Never print secrets or put them in browser variables.
