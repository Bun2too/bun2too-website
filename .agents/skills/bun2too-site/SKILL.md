---
name: bun2too-site
description: Create or update Bun2Too marketing pages, capability copy, official branding, and responsive components. Use for site presentation and service-positioning work; use the domain guides for identity, support, or release changes.
---

# Bun2Too site development

Read [root guidance](../../../AGENTS.md), [product context](../../../docs/product.md), and the closest scoped guide for files being changed.

## Content and views

The primary service story is AI forward-deployed engineering and AI infrastructure/environment setup, alongside CDP, CIAM, analytics, and consent. Fintech is a supporting area. Shared capabilities, featured flags, explicit slugs, and process steps live in [site.ts](../../../src/lib/site.ts). Presentation is in the shared Services/Hero/UseCases/CTA components.

When a capability changes, keep the homepage, Services introduction, use cases, [SEO metadata](../../../src/lib/seo.ts), [support FAQs](../../../src/lib/support-content.ts), and [product documentation](../../../docs/product.md) consistent. Service schema derives from capability data; `/llms.txt` derives from public descriptions and FAQs. Preserve existing anchor slugs and keep new ones unique.

CMS work uses [Contentful design](../../../docs/contentful-design.md), `src/content/website-seed.json`, and the approved `CmsBlocks` registry. Live page/card/FAQ copy and block ordering come from Contentful; the original shared exports remain compatibility/bootstrap data. Keep stable service anchors, code-owned consent/security controls, and server-only delivery credentials. Management/Preview tokens never enter deployed runtime.

## Presentation

Use the official `public/bun2too/` wordmark/rabbit/icons and current authored CSS. Preserve the established visual direction and the two featured AI cards before four customer-technology cards. Check layout at desktop, two-column, and small mobile breakpoints. Keep public pages server-rendered and interactive behavior in client components. Never invent customer evidence, pricing commitments, or performance claims.

## Verification and handoff

Run appropriate existing checks for changed behavior. For responsive changes, build into an isolated directory if a developer server is active, then use the desktop/mobile browser suite. Do not add wording-only tests. Update the relevant view/feature documentation and report source changes separately from publication. [Development workflow](../../../docs/development.md) has commands and port conventions.
