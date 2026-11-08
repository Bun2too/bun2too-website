---
name: bun2too-release
description: Verify Bun2Too production builds, desktop/mobile checks, HTTP smoke tests, Netlify adapter/function packaging, GitHub Actions, or branch-to-environment release configuration. Publishing is only in scope when the current user request authorizes it.
---

# Bun2Too release verification

Read [root guidance](../../../AGENTS.md), [development workflow](../../../docs/development.md), and [deployment setup](../../../docs/setup.md). Inspect the working tree and current task scope before mutations; preserve the developer's existing staged/uncommitted work.

## Build and checks

Use Node 24 and the npm lockfile. Run checks appropriate to the change. `npm run build` also validates required routes in the build artifact. Use the same `NEXT_BUILD_DIR=.next-check` for build/browser checks when isolating from an active `.next` server; tests own port 3100 while supplied local Auth0 callbacks use 3000. Do not stop a developer's server to make a check convenient.

Browser tests mock newsletter/support providers and intercept Auth0 redirects. Smoke checks exercise invalid/unauthorized API requests only. Neither proves live consent, RAG answers, inquiry delivery, or email/push operation. Avoid creating extra tests that mirror copy or formatting.

`netlify build --offline --context production` verifies adapter/function packaging without publication. Keep private environment files and credentials out of temporary source snapshots. Scheduled support cleanup must be packaged when retention code changes.

## Release boundary

The origin is `https://github.com/Bun2too/bun2too-website.git`. Actions verifies PRs and publishes branch pushes: `dev → dev`, `qa → qa`, `main → prod`, each to a separate Netlify site. `--prod` means that selected site's live URL. Preserve environment-specific public URLs, Auth0 settings, indexing controls, and runtime secret scopes.

Follow the current user's authorization for commit/push/publish. Source/build work does not grant those actions by itself. When release is in scope, confirm the matching site/configuration, use the existing pipeline or supported Netlify packaging, and verify the returned/live route state. If required account access is missing, report the concrete missing setup and complete independent work; do not claim a deployment or expose secrets to bridge the gap.
