# Publication audit — November 8, 2026

The audit reviewed publishable nonignored files, staged/index contents, reachable branch/tag/remote history, deployment workflows, configuration defaults, identity/support boundaries, and generated browser assets. It did not change remote credentials, stage/commit/push code, rewrite history, or deploy. Local tool snapshot refs and ignored local state are not part of an ordinary branch push; do not publish them with a mirror push.

## Findings addressed

| Finding | Result |
| --- | --- |
| Real tenant/client defaults and infrastructure inventory in source/context | Removed or converted to reserved synthetic examples. Previous actual defaults were migrated to ignored local configuration without printing values. |
| Real tracking identifiers in source/test/docs | Environment-only public build configuration; browser tests use fixture IDs. |
| External rewrites exposed backend destinations in client manifests | Fixed server-side Insights proxy handlers; visitor credentials/cookies are not forwarded and upstream errors/redirect origins are not exposed. |
| GitHub secrets did not provision Functions runtime | Validated, site-matched runtime synchronization to the selected Netlify site's production context. |
| Public CI could accidentally use operational provider values | Fixture builds without deployment secrets; deployment limited to first-party release branches after verification. |
| Moving action tags and persisted checkout credentials | Actions pinned to resolved commits; persisted checkout credentials disabled. |
| Accidental publication of local configuration/artifacts | Expanded ignore rules, working/index/history guard, and independent checksum-pinned Gitleaks scans. |
| Future commits used a regular email | Repository-local future identity changed to the owner's approved GitHub no-reply address. Existing commit metadata remains unchanged. |
| Nonessential metadata in official logo PNGs | Removed textual metadata from two assets and verified decoded pixel hashes stayed identical. |

## Evidence and limits

- Publication guard passed for reviewed working files and index; reachable committed history contained no additional credential finding. It compares contents against available ignored local configuration without printing values.
- Independent Gitleaks candidate and history scans passed with redacted reporting and verified release-archive checksums.
- Production dependency advisory audit reported zero known vulnerabilities at audit time. Compatible transitive updates removed all high-severity findings; a narrow `picomatch` 2.x override pins its patched release and preserves other dependency majors.
- Unit tests cover configuration validation/site mismatch refusal, no deployment-token forwarding, safe proxying, credentials, consent, and privacy boundaries. Production test builds and desktop/mobile checks use synthetic provider settings; real provider accounts are not exercised.
- Final verification passed: 39 unit tests, all 96 desktop/mobile browser checks, HTTP smoke checks, documentation links, and offline Netlify adapter/function packaging in an isolated sanitized snapshot. The scheduled retention function was included. This was packaging verification, not publication or a live runtime-secret sync.
- Prior configuration defaults remain in ignored local settings, not source. Do not paste operational details back into tracked files.
- Public identity/tag/site IDs remain observable during deployed use. Branding/contact information, source behavior, DNS, public image sources, and Git attribution cannot be made untraceable by storing credentials in Secrets.
- Existing history attribution and copies held by others are unchanged. No scan guarantees absence of every possible secret; review staged changes again immediately before committing.

Populate **all required** per-environment Secrets and Variables in the [configuration inventory](security.md) before deploying. Deployment fails closed if full integration configuration is incomplete. Netlify synchronization was checked using isolated API fixtures and official API contracts, not by mutating a live account during this audit.

## Remaining build-tool advisories

The full dependency audit still reports **19 advisories: 17 moderate and 2 low; zero high or critical**. These are development/build dependencies, principally the current pinned Netlify CLI's transitive tree and Tailwind's file tooling. They are not in the production dependency audit. A clean credential scan is not a clean full dependency audit.

| Underlying advisory | Remaining exposure / handling |
| --- | --- |
| [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Older compatible glob majors in packaging/build tools. Patched latest major exists, but forcing it through vendor ranges would be an unsupported dependency-major override. CI has bounded job timeouts and no deployment secrets in untrusted PR builds. |
| [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Compatible older majors in tracing/archiving/CSS tooling. High-severity wildcard fixes were applied within those majors; this moderate advisory requires the newer major. |
| [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low-severity transitive configuration dependency in the current Netlify CLI tree; the queried current release had no patched version. |

The npm suggested `--force` remediation would downgrade the direct Netlify CLI across major versions. That was not applied. Keep release branches/configuration trusted and monitor vendor updates. Review this residual tooling risk before privileged builds; this report does not represent it as fully remediated. CI blocks moderate-or-higher **production** advisories and runs secret/publication checks; the full development audit remains an explicitly documented follow-up.
