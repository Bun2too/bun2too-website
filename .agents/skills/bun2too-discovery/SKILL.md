---
name: bun2too-discovery
description: Update Bun2Too search/AI discovery, canonical metadata, structured data, sitemaps, crawler rules, public Insights views, or feed/push proxy integration. Use when indexing or public editorial behavior is in scope.
---

# Bun2Too search and Insights

Read [root guidance](../../../AGENTS.md), [search setup](../../../docs/search.md), and [Insights integration](../../../docs/insights.md) as relevant.

## Search and public facts

Use `src/lib/seo.ts`, the escaped StructuredData component, the visible public content, and the framework's installed metadata guides. Keep canonical page URLs and descriptions distinct; service schema derives from capability data. Article markup uses actual published content/timestamps. Do not invent schema ratings, organizations, dates, results, or search features the app does not implement.

Production is the configured HTTPS primary site. Dev/QA/preview and nonprimary builds stay out of indexing through metadata, headers, robots, and sitemap behavior. Account/API/embed data must not appear in public discovery content. Crawler rules are not authentication. `/llms.txt` is an optional public overview, not a ranking guarantee.

## Editorial integration

The active article views are `/insights` and `/insights/[id]` within this site. `INSIGHTS_API_ORIGIN` selects the separate public backend. Preserve the current feed, unsubscribe, and push rewrites, signup frame policy, and service worker behavior. Do not put the editorial administration key in the website or rewrite current local links back to a superseded external plan.

Maintain server-rendered readable content and distinct missing/unavailable states. The current list feed exposes the latest 100 entries; do not claim an exhaustive historical sitemap without a supported enumeration API. Keep article/source data safe to render and keep structured data consistent with visible text.

Verify generated HTML, discovery files, private/staging exclusions, and relevant existing tests. Ownership verification, index submission, DNS, firewall settings, and actual search inclusion are external operations/results; report their true status.
