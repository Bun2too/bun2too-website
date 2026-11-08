# Search and AI discovery

The site provides canonical metadata and unique descriptions for its public pages, Open Graph/Twitter previews, a branded PNG at `/og`, JSON-LD for the organization, website, pages, services, breadcrumbs, public FAQs, and published Insights articles. Markup describes visible content; it does not invent ratings, customers, locations, prices, or results.

`/sitemap.xml` lists public pages and articles exposed by the public Insights feed. Article modification entries use actual publication timestamps; static pages do not claim a fabricated last-modified date. The public feed currently exposes the latest 100 articles, so older article discovery also relies on internal links and direct article URLs. A backend outage leaves the main sitemap available. `/insights` and articles render their content on the server for crawlers. Existing newsletter, push, and feed integration is preserved.

`/robots.txt` allows public search crawling, including OAI-SearchBot, ChatGPT-User, Claude search/user agents, and PerplexityBot. Private APIs, account pages, and embedded signup are excluded. These restrictions do not provide authentication. APIs also send `X-Robots-Tag: noindex, nofollow`, and private records are never exposed through a public listing endpoint. Legacy `/hero`, `/cta`, and `/articles` are noindex pages with canonical links to their primary destinations.

`/llms.txt` is an optional, readable directory of public information and common questions. It helps compatible tools discover source pages; it is not an established ranking requirement and does not guarantee AI inclusion. Google says the same technical SEO and helpful-content practices apply to AI search, without special AI markup requirements. See [Google's guidance](https://developers.google.com/search/docs/appearance/ai-features) and [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

## Configure each environment

Set `NEXT_PUBLIC_SITE_URL` to the site's exact HTTPS primary origin, such as `https://bun2too.com`. Set `SITE_ENVIRONMENT=prod`, `dev`, or `qa` in Netlify's build environment. The workflow sets the environment from the branch and requires an environment-specific `NEXT_PUBLIC_SITE_URL` GitHub variable. Dev, QA, preview, and non-primary host builds receive noindex headers/metadata, a disallow-all robots file, and an empty sitemap. Each environment remains a separate Netlify site.

Optional build-time `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` values add ownership verification meta tags. Set the corresponding GitHub environment variables if Actions owns your build, and Netlify build variables as needed.

## After publishing

1. Set bun2too.com as the production primary domain in Netlify; redirect alternate domains there. Check HTTPS and avoid indexing Netlify preview URLs with production configuration.
2. Verify ownership in Google Search Console and Bing Webmaster Tools, then submit `https://bun2too.com/sitemap.xml`. Inspect `/services`, `/support`, and one article to confirm indexability and canonical selection.
3. Check `robots.txt`, `/llms.txt`, `/og`, rendered metadata, and JSON-LD. Use Google's Rich Results Test and Schema.org validator where relevant. FAQ markup does not promise a rich result.
4. Check that Cloudflare/Netlify bot protection allows the crawlers you intend to serve. An allowed robots rule cannot override a firewall challenge. Do not disable protections on private endpoints.
5. Monitor crawl/index errors, actual queries, and page experience. Keep public support answers and source material current. Search engines choose whether and when to index or rank content; repository changes cannot guarantee placement or submit verification on your behalf.
