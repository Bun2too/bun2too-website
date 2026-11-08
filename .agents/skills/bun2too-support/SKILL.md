---
name: bun2too-support
description: Implement or troubleshoot Bun2Too Onyx RAG chat, support dialog, public source links, private Netlify inquiry collection, visitor ownership, rate limits, or retention. Applies to the support integration rather than general AI application development.
---

# Bun2Too public support

Read [root guidance](../../../AGENTS.md), [support setup](../../../docs/support.md), and the [architecture/storage map](../../../docs/architecture.md). The chosen integration is a new dedicated public Onyx agent and private Netlify inquiry storage. No configured/live state should be assumed from source files.

## Protect the knowledge and identity boundary

`src/lib/onyx.ts` uses the server-only key and configured nondefault public agent, public document-set name, and internal search-tool ID. Every question is constrained to that document set and allowed/forced search tool. Respect the configured deployment's API contract. Verify its version privately when changing the contract rather than publishing infrastructure inventory or assuming the newest docs apply.

Never accept browser-selected Onyx session IDs, models, tools, or retrieval scopes. Visitor ownership uses a signed HttpOnly cookie and server-owned conversation records. Preserve conditional-write limits/locks, input bounds, first-chat verification, timeout handling, and the conversation cap.

Return answer text and reviewed public citation URLs only. Do not expose reasoning, tool traces, document owners, private source links, or raw upstream errors. An agent's underlying permissions/public corpus matter in addition to URL filtering.

## Inquiry collection and UI

Private inquiries use the `bun2too-support` Netlify store, explicit contact-purpose consent, idempotency, and optional server-owned transcript attachment. They never enroll marketing. No public inbox or generic blob read/list API should be added. Preserve configured expiry and the scheduled cleanup's relationship to separate Onyx retention.

The lazy-loaded native dialog must work on mobile and short desktop viewports, keep the composer visible, support keyboard close/focus, and show actual failures instead of fabricated receipts. Keep the launcher out of the signup embed.

Use isolated support tests/browser mocks for routine changes. For live checks, follow current authorization and the guide's test-data plan. Update privacy/setup/architecture when contracts or retention change. `npm run support:check` is read-only; it does not verify answer quality or create the agent.
