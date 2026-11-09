---
name: bun2too-support
description: Implement or troubleshoot Bun2Too support FAQs, private Netlify inquiry collection, native inquiry dialog, visitor ownership, idempotency, rate limits, or retention. Future AI integrations are a separately scoped change.
---

# Bun2Too customer support

Read [root guidance](../../../AGENTS.md), [support setup](../../../docs/support.md), [architecture](../../../docs/architecture.md), and [security/configuration](../../../docs/security.md).

## Current boundary

Support consists of public FAQs and a lazy-loaded Contact Bun2Too inquiry form. It has no AI chat endpoint, model calls, document search, provider credentials, or transcript attachment. Open WebUI is planned, not connected. Do not restore an old provider or invent future API credentials/knowledge behavior from the service name alone.

## Protect inquiry collection

`src/lib/support.ts`, `support-api.ts`, and `support-store.ts` own signed HttpOnly visitor identity, strict input/consent checks, ownership/idempotency, conditional-write rate limits, and private Netlify storage. No public inbox or generic blob read/list endpoint should be added. Emails are self-reported contact information, never proof of identity. Inquiry submission does not enroll marketing.

The `bun2too-support` store retains new inquiries for 90 days. The daily retention function also cleans expired rate limits and legacy conversation records, without creating new chats or calling an external AI service. Do not delete existing customer records or change retention merely to remove code.

## UI and verification

Preserve native-dialog keyboard/close/focus behavior, accessible field labels, unchecked inquiry consent, CAPTCHA, honest availability/errors, and confirmation only after a saved reference is returned. Hide the launcher on signup embeds. Use isolated fixtures for tests; real inquiry writes need an authorized test environment and task scope. Never claim a deployment or a future AI connection from a local test.

Read [security](../../../docs/security.md) before adding private endpoints or service configuration. If future AI work is explicitly requested, define the authentication, public knowledge boundary, consent, retention, and server-only contract first. Keep that separate from the existing inquiry flow.
