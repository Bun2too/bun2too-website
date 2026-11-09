# App Router guidance

Apply the root guide and read `../../docs/architecture.md` for the current route map. Public content is rendered in server pages. Client authentication is provided by `components/AuthProvider.tsx`; it does not establish a Next.js server session.

- Use `@/lib/seo` page metadata/canonical helpers and escaped `StructuredData` for public views. Keep metadata/schema consistent with visible text. Indexing depends on site/environment configuration.
- `params` for dynamic routes are asynchronous in the installed Next.js version; read its relevant local docs before changing route conventions.
- Keep `/insights` and article routes integrated with the public editorial backend. Preserve RSS/Atom/push/unsubscribe rewrites and the restricted signup embed. Account/API/embed/legacy views have deliberate indexing behavior.
- API handlers validate origin, input size, purpose/consent, and any required access token or visitor ownership before calling external services. Never accept browser-selected Auth0 user IDs or private support record keys as authority.
- New public views need the appropriate metadata, discovery links, architecture documentation, and meaningful existing checks. Do not include private account or inquiry state in server-rendered markup or sitemaps.
- Keep `/terms`, `/cookies`, and `/privacy` consistent with actual storage/provider behavior. Texas/Collin County venue is an owner-preferred legal draft; do not claim enforceability or recorded clickwrap acceptance. Browser cookie choices never constitute acceptance of terms or newsletter enrollment. See `../../docs/legal-and-cookies.md`.
- Build output is served through Netlify's Next.js adapter. Keep server routes; do not restore `output: export`.
