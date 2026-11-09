# Bun2Too website

Bun2Too helps businesses build, deploy, and operate AI and connected customer technology. The site leads with **AI forward-deployed engineering** and **AI infrastructure/environment setup**, alongside CDP integration, customer identity, analytics, and consent. Fintech remains a supporting area of experimentation.

This repository contains the marketing site, integrated Insights views, Auth0 account/subscription flows, search discovery endpoints, and the private customer inquiry integration. It uses Next.js App Router, React, TypeScript, Tailwind/authored CSS, and Netlify hosting/functions.

See [public-repository security and exact GitHub/Netlify configuration](docs/security.md) before publishing. No real environment credentials, backend hosts, tenant IDs, agent IDs, or tracking IDs belong in Git.

## Start here

| Guide                                                      | Purpose                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                     | Entry point for coding assistants: repository facts, constraints, commands, and skill routing |
| [Product and services](docs/product.md)                    | Capability positioning, copy sources, stable service anchors, public knowledge alignment      |
| [Architecture and feature inventory](docs/architecture.md) | Every view, API/proxy, provider boundary, and storage/data flow                               |
| [Development workflow](docs/development.md)                | Local setup, checks, isolated builds, and change/release conventions                          |
| [Agent and skill index](docs/agent-context.md)             | Scoped `AGENTS.md` guidance and five repository-local `SKILL.md` workflows                    |
| [Deployment and Auth0](docs/setup.md)                      | One-time GitHub/Netlify configuration, SPA callbacks, Management API and consent setup        |
| [Insights integration](docs/insights.md)                   | Public editorial backend, server-rendered articles, feeds, signup embed, and updates          |
| [Search and AI discovery](docs/search.md)                  | Canonical metadata, structured data, crawler/indexing controls, and search ownership setup    |
| [Public support setup](docs/support.md)                    | Provider-independent private inquiries, retention, and optional Open WebUI setup boundaries |
| [Terms and cookie preferences](docs/legal-and-cookies.md) | Legal draft/review notes, cookie inventory, consent gates, and adding future trackers |
| [Visual design and artwork](docs/visual-design.md) | Responsive hero layouts, generated asset map, prompts, and email hydration regression |
| [Integration readiness](docs/readiness.md) | Implemented work versus remaining live credentials, provider setup, and deployment verification |
| [Public repository security](docs/security.md) | Exact GitHub Secrets/Variables inventory, automatic Netlify runtime sync, public/private boundaries, and pre-push checks |

## Service capabilities

| Capability                                | Business enablement                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI forward-deployed engineering**       | Work alongside business teams to build AI applications, RAG/agent workflows, integrate existing systems, evaluate behavior, and move into operational use. |
| **AI infrastructure & environment setup** | Establish cloud or self-hosted model serving, retrieval/vector stores, secure access, deployment pipelines, observability, and cost controls.              |
| CDP & integration                         | Connect CRM, product, support, and operational signals into consistent customer context.                                                                   |
| Customer identity                         | Design CIAM, Auth0/SSO, sign-in, and account journeys.                                                                                                     |
| Analytics & AI                            | Understand journeys and connect insights with workflows and automation.                                                                                    |
| Consent & preferences                     | Carry customer choices through subscriptions, communication preferences, and the data lifecycle.                                                           |

The homepage and Services view feature the two AI capabilities before the four customer-technology cards. Use cases are illustrative, not invented customer case studies. Capability copy and explicit anchor slugs live in [`src/lib/site.ts`](src/lib/site.ts); FAQs, metadata, and service schema share or reference that public content. Official brand assets are in [`public/bun2too/`](public/bun2too/).

## Run locally

Use Node 24 (`nvm use`) and the tracked npm lockfile:

```sh
npm ci
```

Copy `.env.example` to `.env.local` only if a local environment file does not already exist; otherwise merge the names you need. Keep actual credentials out of tracked files.

```sh
npm run dev
```

Open **http://localhost:3000**. Public views render without private provider credentials. Auth0 login requires valid SPA settings/callbacks; subscription, private storage, and RAG behavior additionally require their server configuration. Missing configuration shows an unavailable state rather than a fabricated result.

## Views and site functions

| View                                       | Function                                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `/`                                        | Branded hero, featured AI delivery/infrastructure, customer technology, approach, Insights entry, newsletter, and contact CTA |
| `/services`                                | Six capabilities with tags and stable section anchors; supporting fintech context                                             |
| `/process`                                 | Discover, design, deliver, and evolve workflow                                                                                |
| `/usecases`                                | AI engineering/infrastructure and customer-technology examples, with a fintech experiment                                     |
| `/contact`                                 | Private inquiry entry, optional configured email contact, account and newsletter entry                                        |
| `/account`                                 | Login/signup/logout, profile, verified newsletter confirmation, topic choices, and unsubscribe                                |
| `/insights`                                | Server-rendered public article hub, reading/update features, RSS/Atom links, and newsletter                                   |
| `/insights/[id]`                           | Article content, artwork, source links, and article metadata/structured data                                                  |
| `/insights/signup`                         | Reusable consent form for approved embed origins; primary navigation and the support launcher are hidden                                      |
| `/support`                                 | Public FAQs and private inquiry form                                                         |
| `/privacy`                                 | Identity, consent, provider, support/inquiry handling, and retention description                                              |
| `/cookies`                                 | Cookie/storage inventory and separate preference, Analytics, and Marketing controls; optional categories default off |
| `/terms`                                   | Bun2too, Inc. website terms covering accounts, AI, intellectual property, risk, and Texas/Collin County dispute venue |
| `/hero`, `/cta`, `/articles`               | Working legacy views with noindex/canonical metadata                                                                          |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | Public crawling, canonical discovery, and optional machine-readable overview                                                  |
| `/og`                                      | Branded 1200×630 social-preview PNG                                                                                           |

The active article experience is **https://bun2too.com/insights**, rendered inside this site. It reads a separate public editorial backend selected by `INSIGHTS_API_ORIGIN` (required private environment configuration; no hardcoded default). The related `insights.bun2too.com` origin remains allowed by the embed policy. Feeds, unsubscribe, and Web Push use fixed server proxy handlers; the backend hostname is not serialized into browser rewrites. Do not replace this current integration with the older external-only article link plan.

## Identity, subscriptions, and support

| Integration          | Implemented behavior                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 React SDK 2.x  | Browser-side Universal Login, signup, logout, and profile; public content remains server-rendered and tokens stay in SDK memory.                                                                                          |
| Auth0 Management API | `POST /api/subscriptions` records an explicit, pending, unverified passwordless email request. Anonymous duplicates do not overwrite existing choices.                                                                    |
| Account preferences  | `GET/PATCH /api/preferences` checks access-token issuer/audience/client/scope/expiry. Activation requires verified email; authenticated users can change topics or unsubscribe.                                           |
| Customer support | Lazy-loaded **Contact Bun2Too** private inquiry form and public FAQs. Optional Open WebUI questions require separate consent and approved public-only model/knowledge configuration. Inquiries remain independent; no transcripts attach. |
| Private inquiries    | Separate consented form saves contact details in private Netlify Blobs. It never enrolls marketing.                                                                          |
| Retention | Signed visitor cookie expires after 24 hours; inquiry records after 90 days. Daily cleanup also handles legacy expired conversation records. |
| Insights updates     | Website-side reading/update controls, feeds, shared consent form, and a push/click service worker. Email digest and Web Push delivery belong to the editorial backend and require its configuration.                      |

The full endpoint/proxy and data-store map is in [architecture](docs/architecture.md). There is no public inquiry inbox or generic blob listing API. Auth0 stores identity/preferences; it is not the campaign email delivery engine. Metadata records the latest preference state and consent provenance rather than an immutable audit ledger.

The site-wide cookie banner offers necessary-only, optional categories, and customization. Footer **Cookie settings** reopens it. Insights read-status persistence requires preference permission. The configured GTM container loads only with Analytics permission; its container and GA4 IDs come from environment variables. Marketing controls Google advertising-related consent separately and defaults off; no standalone advertising pixel is installed. Withdrawal removes matching cookies and reloads when needed to unload running tags. Email, notifications, inquiries, and terms acceptance stay separate. [Terms/cookie documentation](docs/legal-and-cookies.md) contains the original legal draft references and review notes. Operator: **Bun2too, Inc.**; legal/privacy email: **info@bun2too.com**; proposed venue: **Collin County, Texas**.

Six original hero artworks fill marketing, account, legal, and section headers. Local WebP assets, responsive `next/image` sizing, and lazy loading below the fold keep them lightweight. Official logos remain unchanged. [Visual design](docs/visual-design.md) records their prompts, locations, and consumers. Contact/legal email actions use a stable button that opens the browser’s mail handler on click, avoiding hydration mismatches caused by Gmail extensions rewriting `mailto:` anchors.

## Search and AI discovery

Public pages have canonical metadata, social previews, and structured data for the organization, site, pages, services, breadcrumbs, FAQs, and published articles. `/llms.txt` summarizes public facts and links to source pages; it is optional discovery guidance, not a ranking guarantee. Dev, QA, preview, account, API, and signup-embed indexing exclusions are intentional.

Set `NEXT_PUBLIC_SITE_URL` and `SITE_ENVIRONMENT` correctly for each deployment. Optional Google/Bing verification values support ownership meta tags. Search engines still choose whether to crawl, index, or rank content. See [search setup](docs/search.md) for live checks and submission steps.

## Verification commands

```sh
npm run docs:check
npm run typecheck
npm test
npm run build:test
npx playwright install chromium
npm run test:e2e
```

`npm run docs:check` validates repository-relative links across README, documentation, scoped agent guides, and local skills. `npm run build` also validates required pages/APIs in its output. Browser tests start a production server on **3100**, leaving the supplied local Auth0 origin on **3000**. Tests mock newsletter/support HTTP responses and intercept Auth0 redirects; no live customer inquiries, account provisioning, or AI questions are sent by these checks.

If a developer server is already using `.next`, isolate both build and browser startup:

```sh
NEXT_BUILD_DIR=.next-check npm run build:test
NEXT_BUILD_DIR=.next-check npm run test:e2e
```

Additional checks:

```sh
SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke
npx netlify build --offline --context production
```

Smoke checks use invalid/unauthorized API inputs. Offline Netlify packaging includes Next.js server APIs and scheduled retention without deployment. See [development](docs/development.md).

## Release and configuration

Origin: `https://github.com/Bun2too/bun2too-website.git`.

| Branch | GitHub environment | Netlify destination                       |
| ------ | ------------------ | ----------------------------------------- |
| `dev`  | `dev`              | Dev site's live URL                       |
| `qa`   | `qa`               | QA site's live URL                        |
| `main` | `prod`             | Production site with bun2too.com attached |

Each destination is a **separate Netlify site**. The [workflow](.github/workflows/ci-cd.yml) verifies pull requests and publishes branch pushes after documentation-link validation, type checking, unit tests, a production build, and desktop/mobile checks. The deploy job uses environment-specific public values and Netlify's Next.js adapter, publishes the selected site's live URL, and smoke-tests routes. Pull requests do not publish.

Configure public build values and server-only Functions values using `.env.example` and the setup guides. An environment-scoped `NEXT_PUBLIC_SITE_URL` GitHub variable is required. Management API, Turnstile verification, and session secrets never belong in `NEXT_PUBLIC_*` or browser code. Static export/upload cannot host these server integrations.

## Implementation versus live readiness

The source includes these views/integrations and local mocked checks. A live deployment, working Auth0 tenant, private inquiry persistence, email/Web Push delivery, DNS mapping, and search ownership/indexing each need authorized provider configuration and live verification. Do not infer those states from a successful local build. No production credentials or customer records are part of this repository.

`src/app_temp` and `src/components/tsconfig.json` are retained legacy material. Use the active root TypeScript configuration and `src/app`. Generated build/test artifacts are ignored. The repository-local [agent and skill context](docs/agent-context.md) explains how future assistants should navigate and extend the actual application without replacing its established integrations.

Support includes FAQs, private inquiries, and an optional Open WebUI adapter. AI remains disabled until a restricted service account, approved public knowledge collection and model are configured and explicitly enabled. See [support](docs/support.md).

Deployment derives the server audience from the `NEXT_PUBLIC_AUTH0_AUDIENCE` GitHub environment Variable, checks the Management API grant, and verifies browser configuration before publication. [Deployment and form troubleshooting](docs/deployment-troubleshooting.md) explains exact setting names, provider setup, pending subscription activation, and live verification limits.
