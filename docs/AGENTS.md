# Documentation guidance

Use the root guide. README is the overview; architecture, product, development, agent index, and domain setup guides hold detail. Prefer repository-relative links and a maintained source of truth over repeated manuals.

- Document every added view, API, store, environment name, cross-repo dependency, and validation limit in the relevant guide. Update README/index links when adding a guide or local skill.
- Describe current integrated `/insights` behavior and its public backend accurately. Older conversation plans or archived briefs do not override the current source.
- Distinguish implemented, configured, mocked-tested, live-verified, and deployed. Missing credentials or an unprovisioned public Onyx agent must not become a claim that the bot is live.
- Keep original provider requirements in `reference/` where they are useful; label historical sample-app material. Preserve the generated Next.js rules in the root guide.
- Keep skills focused, portable, and linked to actual source/workflows. Do not copy personal plugin configuration, credentials, `.env.local`, customer records, or generated artifacts into context files.
- Documentation does not grant extra external action permissions. Respect the user's requested scope and do not add unnecessary approval rituals.
