---
name: bun2too-support
description: Implement or troubleshoot Bun2Too support FAQs, private Netlify inquiry collection, native inquiry dialog, visitor ownership, idempotency, rate limits, or retention. Includes the optional, explicitly enabled Open WebUI public-support adapter.
---

# Bun2Too customer support

Read [root guidance](../../../AGENTS.md), [support setup](../../../docs/support.md), [architecture](../../../docs/architecture.md), and [security/configuration](../../../docs/security.md).

## Current boundary

Support includes FAQs, private inquiries, and optional Open WebUI questions. The server-only adapter fixes a model and approved public knowledge collection; explicit enablement and a dedicated restricted service account are required. Opening support never calls AI. Each question requires separate AI consent, CAPTCHA, signed browser session and distributed limits; no transcript is stored by the website or attached to inquiries. Read docs/support.md for provider logging/retention limits. Never restore the retired provider or invent live credentials/model IDs.

## Protect inquiry collection

`src/lib/support.ts`, `support-api.ts`, and `support-store.ts` own signed HttpOnly visitor identity, strict input/consent checks, ownership/idempotency, conditional-write rate limits, and private Netlify storage. No public inbox or generic blob read/list endpoint should be added. Emails are self-reported contact information, never proof of identity. Inquiry submission does not enroll marketing.

The `bun2too-support` store retains new inquiries for 90 days. The daily retention function also cleans expired rate limits and legacy conversation records, without creating new chats or calling an external AI service. Do not delete existing customer records or change retention merely to remove code.

## UI and verification

Preserve native-dialog keyboard/close/focus behavior, accessible field labels, unchecked inquiry consent, CAPTCHA, honest availability/errors, and confirmation only after a saved reference is returned. Hide the launcher on signup embeds. Use isolated fixtures for tests; real inquiry writes need an authorized test environment and task scope. Never claim deployment, retrieval quality or a live AI connection from mocked tests. Provider isolation must be verified independently.

Read [security](../../../docs/security.md) before adding private endpoints or service configuration. Preserve separate inquiry/AI consent and fixed server-side model/knowledge selection. Public-only provider permissions are the primary knowledge boundary; prompts/output filters cannot protect internal knowledge exposed to a privileged account. Keep actual backend hosts, credentials and model/collection IDs out of Git.
