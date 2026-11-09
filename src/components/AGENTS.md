# Shared UI guidance

Use the root guide, `../../docs/product.md`, and the applicable integration guide. Keep the current design and assets; use `BrandLogo` and the official `public/bun2too/` artwork without distorting it.

- Capability data and stable anchor slugs come from `../lib/site.ts`. AI engineering and AI infrastructure are the featured first pair; customer technology remains visible. Keep homepage, Services, use cases, FAQs, and discovery copy aligned.
- Avoid unnecessary client components. Browser objects belong in client effects or event handlers; the Auth0 provider initializes after mounting so public server rendering remains usable.
- Login/signup/logout use the official Auth0 SDK. Do not place private Management credentials or private service keys in props, client imports, or browser persistence.
- The newsletter is shared with Insights/embed views. Consent stays unchecked; success must reflect the API result. Missing configuration and upstream failures need honest states.
- `CookieConsent` owns browser preferences independently of Auth0, email, inquiry consent, and terms. Optional storage starts off; Insights persistence uses its permission context. GoogleTagManager loads only with Analytics permission and separately gates advertising signals; withdrawing loaded tracking permission reloads to unload runtime code. Read `../../docs/legal-and-cookies.md` before adding storage or tags.
- `PageArtwork` owns responsive generated-art variants; use local optimized assets and preserve official branding. `EmailButton` opens the browser mail handler on click: avoid reintroducing SSR `mailto:` links that Gmail extensions mutate before hydration. See `../../docs/visual-design.md`.
- Support is lazy-loaded after a user opens it. Preserve native dialog keyboard/close behavior, accessible inquiry fields, explicit contact-purpose consent, truthful availability/errors, and no AI requests before separate explicit AI consent. Optional SupportChat remains independent from inquiries; never attach its questions/answers. Hide the launcher on the signup embed.
- Retain label associations, keyboard focus, mobile layouts, reduced-motion support, and image dimensions. Verify responsive changes with the existing desktop/mobile checks; do not create wording-only tests.
