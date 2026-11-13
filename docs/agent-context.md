# Agent and skill entry points

This repository includes project-specific context so future assistants can work from the same architecture, product positioning, and integration boundaries. Start with the root guide, then read only the domain guidance needed for the task. All links are repository-relative; no personal home directory or optional connected plugin is required.

CMS presentation/content work starts with [Contentful design and publishing](contentful-design.md): it explains the seven models, safe server reader, ordered block registry, fallback snapshot, migration commands and environment split. Never put real space identifiers or API credentials into guides, fixtures or skills.

## Scoped agent guidance

| File                                                          | Scope                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Root AGENTS.md](../AGENTS.md)                                | Product intent, app map, commands, shared boundaries, documentation/skill routing  |
| [src/app/AGENTS.md](../src/app/AGENTS.md)                     | App Router views, metadata, public/server boundaries, API entry points             |
| [src/components/AGENTS.md](../src/components/AGENTS.md)       | Shared UI, official branding, forms, Auth0 client behavior, support dialog         |
| [src/lib/AGENTS.md](../src/lib/AGENTS.md)                     | Shared content, server integrations, ownership/consent, SEO and external contracts |
| [src/styles/AGENTS.md](../src/styles/AGENTS.md)               | Theme, responsive feature hierarchy, accessibility and composer layout             |
| [tests/AGENTS.md](../tests/AGENTS.md)                         | Meaningful offline validation, browser fixtures, live-data isolation               |
| [netlify/functions/AGENTS.md](../netlify/functions/AGENTS.md) | Scheduled retention and private store ownership                                    |
| [docs/AGENTS.md](AGENTS.md)                                   | Documentation maintenance and implementation/readiness distinctions                |

The [original Auth0 SDK brief](reference/auth0-sdk-brief.md) is preserved as reference. Its historical sample-app instructions do not replace the existing Next.js implementation. Root guidance applies to the project generally; Auth0-specific material is loaded for identity work. The generated Next.js agent-rules block remains in the root file.

## Repository-local skills

Each skill has a `SKILL.md` entry point and `agents/openai.yaml` discovery metadata. Skills are checked into `.agents/skills/`, allowing project discovery in compatible clients. Other assistants can follow the same files manually. The files are guidance, not installed background workers or a runtime agent framework.

| Skill                                                             | Use it for                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [bun2too-site](../.agents/skills/bun2too-site/SKILL.md)           | Marketing views, capability copy, branding, responsive UI, and related content propagation |
| [bun2too-identity](../.agents/skills/bun2too-identity/SKILL.md)   | Auth0 SDK, signup, subscription consent/preferences, and token validation                  |
| [bun2too-support](../.agents/skills/bun2too-support/SKILL.md)     | Support FAQs, private Netlify inquiries, optional Open WebUI, and retention                    |
| [bun2too-discovery](../.agents/skills/bun2too-discovery/SKILL.md) | SEO/AI discovery, structured data, sitemaps, public Insights and feed integration          |
| [bun2too-release](../.agents/skills/bun2too-release/SKILL.md)     | Build/browser/smoke verification, GitHub Actions, Netlify packaging, release configuration |

Examples: “Use `$bun2too-site` to add a capability,” “Use `$bun2too-support` to investigate missing source links,” or “Use `$bun2too-release` to verify this branch's deploy package.” A skill does not grant credentials, permission to contact customers, or authority to publish beyond the current request.

Personal system skills and provider plugins remain outside this repository. The local skills capture the useful repository-specific workflows without assuming another developer has the same machine setup or app connections. Use the current repository and official provider/framework documentation when a contract is uncertain.

## Keeping context useful

Read [public repository security](security.md) before changing configuration or publishing context. Provider/tenant/backend/agent/tag values are environment-only; use the fixture JSON for tests. Run both publication guards. The deploy inventory lives in `scripts/deploy-config.mjs`, and no documentation or local skill should reintroduce operational defaults.

Update the relevant skill or scoped guide when a workflow or constraint changes. Keep source facts in their existing modules, and link to architecture/setup references instead of copying full manuals into every file. Record whether something is implemented, configured, tested with mocks, verified live, or deployed. Never include API keys, tokens, customer records, `.env.local`, generated caches, or machine-specific absolute paths in context files.

For browser storage, tracking, and legal views, read [terms and cookies](legal-and-cookies.md). Optional consent starts off. Preserve the cookie gate and `GoogleTagManager` basic-mode loader: Analytics and Marketing are separate, account/embed/callback contexts are excluded, and withdrawal unloads running tags. Do not combine browser choices with newsletter/support consent or claim recorded terms acceptance from a footer link. [Visual design](visual-design.md) maps generated assets and the Gmail hydration regression; [readiness](readiness.md) distinguishes implementation from missing live service configuration.

Run `npm run docs:check` after editing links. It checks repository-relative targets and exact filename casing so links also work on Linux. Repository `.gitignore` exceptions keep `AGENTS.md` files trackable even if a developer globally ignores that filename. The five skill packages also have validated YAML frontmatter and discovery metadata. Keep this index named `agent-context.md`: `agents.md` would collide with `AGENTS.md` on a case-insensitive filesystem.
