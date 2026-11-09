# Public repository security and deployment configuration

This repository intentionally publishes Bun2Too's website source, public brand, business contact address, service descriptions, and integration contracts. It must not publish credentials, actual backend endpoints, tenant/application defaults, local account setup, customer records, private agent IDs/document-set names, infrastructure inventory, or developer-machine paths. Real values live outside Git. No scan can guarantee that every possible secret or business inference has been eliminated; this guide defines the reviewed boundary and repeatable checks.

## Configure GitHub before deploying

The dated [publication audit](security-audit.md) records addressed findings, evidence, and limits.

Open **repository Settings → Environments** and create **dev**, **qa**, and **prod**. For each environment, add the Secrets and Variables below. Use different Netlify sites and provider credentials for each environment. The branch mapping is `dev → dev`, `qa → qa`, `main → prod`. Values are never placed in the workflow YAML, committed `.env` files, issues, screenshots, or chat.

### Environment Secrets

These names appear under `secrets.NAME` in `.github/workflows/ci-cd.yml`. “Private setting” means the value is deliberately absent from the public repository; it does not necessarily grant access by itself.

| Secret name | Where to obtain it / purpose |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | Netlify personal/deployment access token authorized for the selected site. Keep its permissions/account access as narrow as available. Runner only; never copied into website runtime. |
| `NETLIFY_SITE_ID` | Selected site's opaque project/site ID. Kept private as deployment inventory; it is not an access credential. Runner only. |
| `AUTH0_DOMAIN` | Auth0 tenant hostname, no scheme/path. Must match `NEXT_PUBLIC_AUTH0_DOMAIN`; the browser inevitably exposes the SPA copy. |
| `AUTH0_MANAGEMENT_CLIENT_ID` | Separate M2M application's client ID; private operational setting, never the SPA client. |
| `AUTH0_MANAGEMENT_CLIENT_SECRET` | M2M credential. Grant only the Management permissions in [identity setup](setup.md). |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server verification key; pair with the public site key. |
| `SUPPORT_SESSION_SECRET` | Independently generated random value of at least 32 characters per environment; signs visitor cookies. |
| `INSIGHTS_API_ORIGIN` | Editorial backend's HTTPS origin, without credentials, query, or API path. Used server-side for builds and runtime requests. |
| `OPENWEBUI_BASE_URL` | Optional AI service HTTPS origin, no API suffix. Server-only; see [support setup](support.md). |
| `OPENWEBUI_API_KEY` | Optional dedicated non-admin public-support service credential. |
| `OPENWEBUI_MODEL_ID` | Optional approved public support model ID, never a browser-selected model. |
| `OPENWEBUI_KNOWLEDGE_ID` | Optional approved public-only knowledge collection ID. |
| `INSIGHTS_EMBED_ORIGINS` | Optional comma-separated HTTPS origins permitted to frame signup. Leave absent if unnecessary. Configured origins become observable in the public CSP header. |

All listed secrets except optional `INSIGHTS_EMBED_ORIGINS` and `OPENWEBUI_*` are required for the full-site release. The four Open WebUI Secrets are required only when its enable Variable is true. Configuration validation stops deployment before syncing when required values are absent, malformed, or inconsistent. Missing optional values clear old synced values, rather than silently retaining obsolete configuration.

### Environment Variables

These appear under `vars.NAME`. They are public configuration, not credentials. You may choose encrypted GitHub storage instead, but the workflow would need to reference `secrets.NAME`, and client-facing values will still be visible in the deployed website.

| Variable name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Exact HTTPS origin of this environment's website. Must belong to the chosen Netlify site. |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | SPA login hostname, no scheme or path. |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Public SPA application ID. No SPA client secret exists in the browser flow. |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Exact custom Auth0 API Identifier. CI uses this single value for both SPA requests and server `AUTH0_AUDIENCE`; the former duplicate GitHub Secret is unused. |
| `OPENWEBUI_PUBLIC_SUPPORT_ENABLED` | Optional `true`/`false`, default false. Enable only after approving public-only model/knowledge permissions; synced server-side. |
| `NEXT_PUBLIC_AUTH0_EMAIL_CONNECTION` | Passwordless connection name; defaults to `email`, also mirrored as `AUTH0_EMAIL_CONNECTION`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public CAPTCHA widget site key. |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | Your actual published Google Tag Manager container ID. Source/test fixture IDs are not production settings. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Your actual GA4 destination ID, paired with the container; supports explicit analytics disable on withdrawal. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public contact override; defaults to the confirmed public business address. |
| `GOOGLE_SITE_VERIFICATION` | Optional public search ownership token, intentionally published in page metadata. |
| `BING_SITE_VERIFICATION` | Optional public search ownership token. |

`SITE_ENVIRONMENT` is derived by the workflow, not manually supplied: `dev`, `qa`, or `prod`. `NEXT_TELEMETRY_DISABLED` is a non-secret build setting. All actual SPA/tag identifiers were removed from defaults and documentation; obtain them from the relevant provider's authorized dashboard.

## How runtime configuration reaches Netlify

GitHub Secrets alone do not reach deployed Functions. The workflow runs `scripts/sync-netlify-env.mjs` before `netlify build`. The named inventory and validation live in `scripts/deploy-config.mjs`.

1. Validate required keys and domain/audience/URL consistency without logging values. Check the M2M token grant and required Management scopes without creating users or sending email.
2. Use the selected site ID/token to read site metadata. Refuse a site whose hostnames do not match `NEXT_PUBLIC_SITE_URL` before changing its configuration.
3. Update/create only the named site-level keys via the official Netlify API, in that site's **production context**. Each dev/QA/prod site has its own production context.
4. Build with the Netlify Next.js adapter and verify expected public settings are present in the browser artifact, then publish and smoke-test that site, including inquiry readiness. Deployment tokens/site IDs are not forwarded to website runtime.

The implementation uses all four platform scopes rather than Pro-only granular restrictions, and does not require paid Secrets Controller. It uses ordinary Netlify environment storage. These variables remain private to authorized site/team administration, but administrators may be able to read ordinary values through the UI/API. They are available to trusted builds, Functions, and the other platform scopes; do not treat build scripts/plugins as an isolation boundary. If your plan supports Functions-only scopes or Secrets Controller, assess those stronger controls separately. A failed sync stops publication; it does not silently fall back to putting secrets in source or static files.

Disable independent Netlify Git-triggered publication/preview builds on these three sites. GitHub Actions owns publication. Never configure production secrets in untrusted deploy previews. Restrict team access, use short-lived/scoped credentials where supported, rotate credentials when staff/access changes, and re-deploy after runtime changes.

## Code and browser boundaries

- `NEXT_PUBLIC_*` is compiled into browser code. A public Auth0 SPA client ID, site key, GTM/GA ID, company name/email, canonical website URL, DNS, public assets, and login redirects cannot be made confidential by calling them secrets. Hiding an endpoint or ID is not authorization.
- Auth0 uses its official PKCE SDK; Management credentials remain server-only. Missing SPA configuration renders an unavailable account view rather than using a real fallback tenant. Server token validation requires an explicitly configured SPA client ID.
- Optional Open WebUI support requires explicit enablement, a dedicated restricted service credential, fixed model and public-only knowledge collection. It uses a server-only proxy with no hardcoded backend. Raw provider errors, citation objects, reasoning fields and internal IDs are withheld. Public-only provider permissions remain essential; text filtering is not a confidentiality guarantee.
- Insights uses fixed server proxy handlers instead of external Next.js rewrites. Backend hostnames are not serialized into the browser rewrite manifest. Proxies do not forward visitor authorization/cookies or upstream cookies/error bodies and rewrite same-service redirects to relative public paths. Public editorial content, image URLs, and permitted embed headers can still reveal their intentionally public source hosts.
- The build checks browser static bundles for active private configuration values. This does not claim that public identifiers, dynamic responses, or all future code paths can be hidden.

See [deployment and form troubleshooting](deployment-troubleshooting.md) for audience drift, missing browser configuration and connection failures.

## Checks before a public push

```sh
npm run security:check
npm run security:scan
npm run docs:check
npm test
NEXT_BUILD_DIR=.next-check npm run build:test
NEXT_BUILD_DIR=.next-check npm run test:e2e
npm audit --omit=dev
```

`security:check` scans nonignored publishable working files, index contents, and reachable branch/tag/remote history for forbidden files, common credential patterns, private deployment fingerprints, machine paths, and exact values from ignored local configuration. Matches are reported by file/line/type with values redacted. `security:scan` independently runs pinned Gitleaks after verifying its release archive SHA-256; it scans a temporary candidate snapshot and committed history, redacts findings, and removes temporary reports. An unavailable/download-failed scan fails rather than passing. The GitHub verification job runs both without deployment secrets and uses reserved synthetic Auth0/tag fixtures. It never completes a real login or contacts subscribers.

### Troubleshooting the pinned scanner

The scanner runs before `npm ci` using only Node built-ins; it needs no Gitleaks license or GitHub/deployment secret. Supported runners are Linux x64 (GitHub's `ubuntu-latest`) and macOS arm64. It downloads the pinned official release, with up to three attempts for network errors, HTTP 408/429, or server errors. Retries use GitHub's official release asset API to avoid a failing release redirect; every download must match the same pinned SHA-256 before extraction/execution.

Failures identify the stage: release download/verification, archive extraction, candidate snapshot preparation, or candidate/history scanning. HTTP status, known system error codes, or scanner exit status are safe to share. Raw network/subprocess output, response bodies, and secret matches remain withheld. Persistent HTTP failures require checking GitHub release availability and runner egress to GitHub and its release asset CDN, then rerunning the updated workflow. A checksum mismatch requires investigating the pinned release; never disable verification or replace the digest with an unverified value. An execution/report error needs the reported stage/status investigated. A finding reports its file, line, and rule with the value redacted and still blocks deployment. Do not add `continue-on-error`, skip history, or bypass the scan to unblock a release.

Review intended staged files and deletions with `git diff --cached` before committing, then rerun checks after staging. Existing index contents can differ from the sanitized working tree. A `.gitignore` rule does not remove a file already tracked; the publication check rejects tracked local-only files too. Real `.env` files, credentials, private keys, cloud/IDE state, browser recordings, and generated build/test artifacts are ignored. `.env.example` is a blank template with intentional public brand defaults.

Use a normal branch push. **Do not use `git push --mirror`**: local editor/tool snapshot refs can retain earlier working-tree copies and are not publishable branch history. File scans also do not change Git commit authors or messages. If personal attribution must stay private, enable GitHub's private-email settings and configure your approved GitHub no-reply address before making commits. Do not assume sanitizing a file rewrites existing public history.

If a real credential is found in committed/published history, revoke/rotate it first. Removing the current file is insufficient; plan any coordinated history cleanup and assess logs/artifacts/forks. No history rewriting, staging, commit, push, remote secret changes, or deployment is performed by this audit itself.

## Workflow trust and maintenance

Actions are pinned to resolved commit SHAs; checkout does not persist credentials. The verification job has read-only repository access and no environment secrets. Deployment runs only after verification on the selected first-party branch and exposes private values only to configuration/build/deploy steps. Keep protected branches/rulesets, review workflow/configuration/dependency changes, restrict who can deploy to environments, and never switch to `pull_request_target` plus untrusted code execution. A public repository cannot protect secrets from malicious code that an authorized person merges into a privileged deployment branch.

Official references: [GitHub secrets](https://docs.github.com/en/actions/concepts/security/secrets), [untrusted workflow risks](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [Netlify runtime variables](https://docs.netlify.com/build/functions/environment-variables/), [Netlify environment API](https://open-api.netlify.com/), [Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller/), and [Gitleaks](https://github.com/gitleaks/gitleaks).
