# Bun2Too website — agent guide

## Project intent

Bun2Too helps businesses enable AI and connect customer technology. Lead with AI forward-deployed engineering and AI infrastructure/environment setup, alongside CDP/data integration, CIAM/Auth0, analytics, and consent. Keep fintech as a supporting experimental area. Preserve the established design and official assets under `public/bun2too/`; avoid unsupported claims about customers, results, certifications, or commitments.

## Start here

- [README](README.md): setup, features, views, integrations, scripts, and release mapping.
- [Product context](docs/product.md): service positioning and shared content sources.
- [Architecture](docs/architecture.md): route/API/storage map and external dependencies.
- [Development](docs/development.md): commands, isolated builds, validation, and release workflow.
- [Agent/skill index](docs/agent-context.md): scoped guides and repository-local skills.

Read the nearest scoped `AGENTS.md` before changing files in that directory. Load only the domain documentation relevant to the task. The original [Auth0 SDK brief](docs/reference/auth0-sdk-brief.md) remains available for identity work; the current app is already implemented.

## Repository facts

- Next.js App Router + React + TypeScript, npm lockfile, Node 24 (`.nvmrc`). Read relevant installed Next.js guides before changing framework APIs.
- Active routes are in `src/app`; `@/*` maps to `src/*`. `src/app_temp` and `src/components/tsconfig.json` are retained legacy material.
- `src/lib/site.ts` owns capabilities, explicit stable service slugs, and primary shared destinations. `src/lib/seo.ts` and `src/lib/support-content.ts` keep discovery/FAQ content aligned.
- The active article view is `/insights`, backed by a separate public editorial API (`INSIGHTS_API_ORIGIN`, required private configuration; no deployment default). Preserve this integration and its proxy routes.
- Authentication uses the official Auth0 React SDK in the browser. Management API access, support/RAG calls, and private storage are server-side.
- Netlify hosts the app and `netlify/functions/support-retention.mts`. Server functionality requires the Next.js adapter; static export is insufficient.

## Working rules

- Respect existing uncommitted/staged work and the user's current scope. Do not reset files, change branches, stage, commit, push, or publish merely to make a local change.
- Before public commits, follow [security/configuration guidance](docs/security.md), run publication/secret checks, and keep actual tenant IDs, backend hosts, agent inventory, and credentials out of code, tests, docs, and skills. Public browser settings still remain observable in deployment.
- Keep public pages server-rendered, interactive behavior in client components, and secrets out of `NEXT_PUBLIC_*`, source, logs, screenshots, and agent context.
- Use official Auth0 SDK flows. Preserve explicit subscription consent, unverified passwordless requests, verified activation, token-validated preferences, and authenticated withdrawal. Do not merge identities by email automatically.
- Onyx support is constrained to its configured public agent, public document set, and search tool. Keep cookies signed/HttpOnly, chat ownership checked, citations public, and inquiry transcripts explicitly selected. Inquiry submission never enrolls marketing.
- Use isolated fixtures for tests. Live Onyx questions, Auth0 provisioning, marketing sends, push notifications, and inquiry writes need the task's authorization and an appropriate test environment.
- Document implemented behavior separately from external configuration and live verification. Do not claim deployment, indexing, delivered email, or a connected knowledge base from code or mocked tests alone.

## Commands

```sh
npm ci
npm run dev
npm run docs:check
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Port 3000 is the supplied local Auth0 origin. Browser checks use 3100. To avoid a developer's running `.next` process, use `NEXT_BUILD_DIR=.next-check npm run build:test` followed by `NEXT_BUILD_DIR=.next-check npm run test:e2e`. Do not stop an unrelated server. Run checks appropriate to the change; do not add tests that only mirror copy or formatting.

`SMOKE_BASE_URL=... npm run test:smoke` checks real HTTP routes using invalid/unauthorized API inputs. `npm run support:check` reads configured Onyx status/agent access; it does not test generated answers. The existing release pipeline maps `dev → dev`, `qa → qa`, `main → prod` across separate Netlify sites. Use [setup](docs/setup.md) and [support setup](docs/support.md) when the task actually requires external configuration or publication.

## Local skill routing

- `.agents/skills/bun2too-site/SKILL.md`: views, service content, visual design.
- `.agents/skills/bun2too-identity/SKILL.md`: login and subscription/consent.
- `.agents/skills/bun2too-support/SKILL.md`: Onyx, private inquiries, retention.
- `.agents/skills/bun2too-discovery/SKILL.md`: search, schemas, Insights/feeds.
- `.agents/skills/bun2too-release/SKILL.md`: build/test/Netlify/GitHub release work.

These skills are optional workflow guidance and do not expand the user's requested scope or credentials. Keep their links and [agent index](docs/agent-context.md) current when the repository changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
