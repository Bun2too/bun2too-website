# Test guidance

Use the root guide and `../docs/development.md`. Tests establish observable behavior and privacy/integration invariants, not proof of live provider configuration.

- Unit tests use Node's test runner with `tsx`, isolated in-memory stores, and mocked network calls. Preserve checks for JWT validation, consent transitions, ownership, conditional-write limits, inquiry idempotency, and metadata/script safety.
- Restore global fetch/environment changes after a test. Fixtures must not contain real keys or customer data.
- Playwright starts the built app on 3100 and checks desktop/mobile flows. Newsletter/support HTTP behavior is mocked; Auth0 redirects are intercepted rather than completing a real tenant flow. Do not loosen a privacy assertion just to make a test pass.
- Run the production build before browser tests. Use the same `NEXT_BUILD_DIR` for both if isolating from a developer server.
- Use `npm run build:test` for browser checks: `tests/fixtures/public-env.json` provides reserved synthetic identity/tag/embed values. This build must never be deployed. Real provider IDs and private backend URLs do not belong in tests or snapshots. Publication guards also check index and branch/tag history.
- Smoke checks use invalid/unauthorized payloads only. Do not send valid inquiries, create real Auth0 users, consume live AI answers, or trigger email/push delivery unless the user authorized that live validation.
- Copy-only or low-impact documentation changes do not need new tests that match implementation text. Update existing expectations where requirements changed and use appropriate regressions for layout/interaction changes.
