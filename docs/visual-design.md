# Visual design, artwork, and hydration

The site uses its existing evergreen/cream/lime theme and official assets under `public/bun2too`. Six original bitmap artworks were generated with the built-in image-generation tool, then encoded as WebP at quality 85 using the installed Sharp dependency. No fallback image API/CLI or replacement brand mark was used. Each deliverable is 1536 × 1024; the complete six-image set is about 506 KB before request-time image optimization.

`src/components/PageArtwork.tsx` is the shared artwork registry and `PageHero` layout. `src/styles/artwork.css` adds focused styles without reformatting the developer’s `globals.css`. Marketing headers pair readable copy with large artwork on desktop and stack on mobile. Legal pages use compact visuals; account identity uses the trust image. `next/image` supplies responsive sizing and intrinsic dimensions; visible heroes load eagerly and supporting section/CTA art lazily. No autoplay video, remote font, or animation is needed.

| Saved asset | Consumers |
| --- | --- |
| [connected-intelligence.webp](../public/images/artwork/connected-intelligence.webp) | Use-case header; retained as an alternative in Hero source. The current homepage uses the owner's official-mark/orbit design. |
| [ai-foundation.webp](../public/images/artwork/ai-foundation.webp) | Services header and homepage capabilities section |
| [delivery-journey.webp](../public/images/artwork/delivery-journey.webp) | Process header and compact homepage process section |
| [knowledge-library.webp](../public/images/artwork/knowledge-library.webp) | Insights and legacy Articles headers |
| [human-connection.webp](../public/images/artwork/human-connection.webp) | Contact/support headers and conversation CTAs, including the legacy CTA view |
| [trust-by-design.webp](../public/images/artwork/trust-by-design.webp) | Account, privacy, cookie, and terms headers |

Article-specific artwork from the editorial API is preserved. The earlier `public/images/customer-architecture.svg` remains available; it is no longer the homepage hero. Preserve official logo artwork independently of these generated illustrations.

Contentful now references copies of these six original artworks through reusable Artwork entries. Page blocks can select published image assets while the local files remain the fallback. The [CMS design document](contentful-design.md) includes generated model/flow/layout diagrams and desktop/mobile captures of the actual QA-delivered page. Official logos remain local and unchanged.

## Final prompt set

The following shared prompt was concatenated with each asset’s subject prompt below. These are the production prompts used with the built-in generator; the source generations were inspected before WebP encoding. Re-encode/re-size as a build asset operation; creative image changes should use image generation with explicit reference images.

> Use case: stylized-concept. Asset type: original premium website hero artwork for Bun2Too, an AI engineering and customer technology consultancy. Create a cinematic editorial 3D still, wide landscape 3:2, crafted architecture and soft physical light, tactile matte ceramic and translucent glass, subtle grain, sophisticated generous composition. Palette is near-black evergreen #10211c, sage, pale lime #d0ed9a, ivory, tiny warm amber accents. Dark forest-green seamless studio background. No text, letters, numbers, logos, watermarks, human faces, robots, screenshots, borders or collage. An arresting sculptural object composition with beautiful materials; clear large forms, refined rather than cluttered. Subject must fill the canvas with carefully balanced space around it.

**Connected intelligence**

> A luminous lime translucent central orb as a person-centered intelligence core, surrounded by nested ivory and dark-green orbital arches, connected through fine glass conduits to small amber and sage data nodes. Sculptural landscape of connected intelligence and customer journeys. Beautiful dynamic asymmetry, premium architectural editorial art. Camera three-quarter angle, center-weighted subject.

**AI foundation**

> An extraordinary miniature architecture of AI infrastructure: staggered dark-green monolithic server-like plinths and stacked ivory glass slabs with luminous lime interconnecting channels, one hovering clear-glass cube above the highest plinth containing a tiny amber light. Purposeful engineering, grounded physical objects with realistic soft shadows, cinematic macro architectural model.

**Delivery journey**

> A continuous elegant ivory sculptural ribbon traverses four staggered floating dark-green platforms, rising from foreground to background, with glowing pale-lime glass gateways and a small amber sphere marking progress. A metaphor for discovery, design, delivery and evolution; elegant architectural planning model with realistic shadows and tactile finish. Whole sculpture clearly visible.

**Knowledge library**

> An elegant suspended fan of translucent glass and ivory pages arranged around one luminous lime sphere, standing on a dark-green circular pedestal; tiny amber orbs follow delicate arcs between the page-like knowledge panels. A sculptural open library of connected knowledge, research and ideas. Macro photographic lighting, beautifully layered depth, intellectual and quietly bold.

**Human connection**

> Two substantial smooth ivory architectural arches rise from opposite dark-green plinths and meet through a luminous translucent lime ribbon bridge, small warm amber sphere at their meeting point. Sculptural human connection, collaboration and clear communication. Three-quarter cinematic composition, tactile crafted forms, no figurines, refined premium warmth.

**Trust by design**

> A monumental nested pair of ivory and deep-sage protective circular arches enclosing a softly glowing pale-lime glass sphere on a substantial forest-green pedestal, with a single amber marker on the inner ring and subtle engraved concentric lines on the base. Abstract sanctuary and clarity as a metaphor for identity, privacy, consent and trust. Precise, reassuring, solid, elegant architectural sculpture; avoid literal shields or padlock icons.

## Reported hydration mismatch

The supplied Contact-page diff showed an expected `mailto:info@bun2too.com` anchor replaced in the browser by `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=info@bun2too.com` plus `target="_blank"`. This is a pre-hydration DOM mutation consistent with a Gmail/mail-handler extension, not a server timezone difference. Clean-browser checks initially did not reproduce it.

`EmailButton.tsx` renders a stable button on the server and client. A user click invokes the browser’s `mailto:` handler; there is no mailto anchor for the extension to rewrite during hydration. Contact and legal/privacy email actions use it. No `suppressHydrationWarning`, disabled SSR, or hidden error overlay is used. Other unrelated extensions can still mutate page markup; inspect the actual differing attributes before changing SSR behavior. [Next.js hydration guidance](https://nextjs.org/docs/messages/react-hydration-error) explains this class of mismatch.

Browser coverage includes a MutationObserver that reproduces the supplied Gmail anchor rewrite, hydration-console assertions, image decode checks, overflow checks, and desktop/mobile screenshots in ignored `test-results/`. Provider/marketing calls are mocked in automated tests; see [readiness](readiness.md) for what remains external.
