# Development and change workflow

Start with [AGENTS.md](../AGENTS.md), [architecture](architecture.md), and the domain guide relevant to your task. The repository uses Node 24, npm with its tracked lockfile, Next.js App Router, React, TypeScript, Tailwind, and authored CSS. Version constraints and scripts are in `package.json`; current framework guides ship in `node_modules/next/dist/docs/`.

## Local setup

```sh
nvm use
npm ci
```

Copy `.env.example` to `.env.local` only if you do not already have a local environment file; otherwise merge the needed names. Keep real secrets in ignored environment files or provider secret storage. Never replace a developer's local values with the example defaults.

```sh
npm run dev
```

Development and normal production startup use **3000**, matching the supplied local Auth0 root callback. Browser tests use **3100** and mock authentication redirects rather than completing real tenant login on that port.

Public views render without private credentials. Missing configuration returns an unavailable state for the corresponding feature. Private inquiries need Netlify runtime storage context, a session signing secret, and production verification. Inquiries have no AI dependency; optional Open WebUI support requires explicit enablement and separate public-only configuration. See [support](support.md) and [deployment troubleshooting](deployment-troubleshooting.md).

## Validation

| Command                                            | What it establishes                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run docs:check`                               | Repository-relative Markdown links across docs, agent guides, and local skills                                                               |
| `npm run typecheck`                                | TypeScript consistency for app sources and browser configuration                                                                             |
| `npm test`                                         | Consent, API/token validation, Insights retrieval, metadata/JSON-LD, support ownership/rate limits/inquiry persistence via isolated fixtures |
| `npm run build`                                    | Production build and required-page/API manifest checks through `postbuild`                                                                   |
| `npm run test:e2e`                                 | Desktop/mobile views, navigation, consent states, SDK redirect construction, Insights, support dialog/inquiries, crawler-visible metadata    |
| `SMOKE_BASE_URL=... npm run test:smoke`            | Real HTTP page/discovery routes and invalid-input/unauthorized API responses; no valid inquiry or chat is sent                               |
| `npx netlify build --offline --context production` | Netlify adapter and function packaging, including scheduled retention; no deployment                                                         |

Install a browser once if needed with `npx playwright install chromium`. Run tests appropriate to the change. Copy-only/documentation changes do not need new tests that simply match the wording. Reuse the browser suite for responsive or interaction changes. Check links and skill metadata when editing repository guidance.

The deployment-command regression feeds the workflow's publish arguments through the pinned Netlify CLI's actual parser/action validation. Deployment execution and error telemetry are replaced, so this check never authenticates, uploads or publishes. It verifies the combined build/publication flags; it does not prove live deployment success.

To avoid colliding with a developer's existing `.next` process:

```sh
NEXT_BUILD_DIR=.next-check npm run build:test
NEXT_BUILD_DIR=.next-check npm run test:e2e
```

Insights fixture builds and the browser server preload a synthetic editorial API at a reserved origin. This provides real server-rendered article cards and detail pages for browser assertions without live provider requests. Release builds do not use the preload. `npm run insights:check` is a separate, explicitly live read-only check of the configured public article API and feed.

The test runner owns port 3100 and tears its server down. Do not stop an unrelated process to reuse its port. Next.js may add isolated build paths to `tsconfig.json`; keep generated caches, reports, and machine-specific paths out of the intended source change. The generated Next.js guidance block in `AGENTS.md` is intentional and should remain.

## Making changes

- Service copy: use `src/lib/site.ts`; keep public slugs, FAQs, SEO descriptions, and `/llms.txt` aligned. The service schema is derived from capabilities. See [product context](product.md).
- Views and UI: public pages stay server-rendered; client components own interactive forms and chat. Use official assets in `public/bun2too/`. Preserve mobile layout, keyboard access, reduced-motion behavior, and the chat's visible message composer.
- Identity: use official Auth0 SDK methods; keep Management API credentials server-only. Preserve passwordless pending signup, verified activation, separate marketing consent, and authenticated withdrawal.
- Support: keep inquiries private, consent explicit, visitor ownership/idempotency checked, and rate limits/retention intact. Never use real customers as test fixtures.
- Insights: keep its public backend integration and unavailable states; do not import editorial administration credentials into this app or replace its local `/insights` routes with stale external links.
- Search: use `pageMetadata`/JSON-LD helpers; keep private routes and staging out of indexing. Do not invent structured-data facts or imply ranking guarantees.
- Documentation: explain new routes, API contracts, data stores, environment names, and verification limits where they belong, then link the relevant guide from README and the agent index.

## Release

The release uses one `netlify deploy --build --prod --context production` invocation so the Next.js adapter’s temporary CDN publish-directory swap stays active through upload. The local release plugin checks browser configuration before the swap and public/browser asset bytes after it, before publication. Offline `netlify build` still verifies packaging but restores raw `.next` on completion; `.netlify/static` then holds the prepared CDN assets.

GitHub Actions verifies pull requests and publishes pushes according to `dev → dev`, `qa → qa`, and `main → prod`. Each destination is a separate Netlify site, with its own configuration. Netlify's Next.js adapter packages server routes; static export/upload is insufficient. User-requested release operations still need the correct repository/site access and the current task's authorization. A source edit or successful local build does not itself publish anything.

## Retained directories

`src/app_temp` and `src/components/tsconfig.json` are legacy material from the original working tree. The active app uses the root TypeScript configuration and `src/app`. Do not use legacy files as current route definitions or remove them casually during unrelated work.

Public CI builds use `npm run build:test` with reserved synthetic identities in `tests/fixtures/public-env.json`; release builds use `npm run build` with the selected GitHub/Netlify environment. Never deploy the test fixture build. Run `npm run security:check` and `npm run security:scan` before public commits. See [security and configuration](security.md).
