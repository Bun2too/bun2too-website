# Product and service context

Bun2Too helps businesses enable AI and connect customer technology. Public positioning leads with **AI forward-deployed engineering** and **AI infrastructure/environment setup**, alongside CDP integration, CIAM, analytics, and consent. Fintech remains an area of applied experimentation rather than the primary identity of the business.

## Capability map

| Capability                            | What it means                                                                                                                                                              | Public anchor                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| AI forward-deployed engineering       | Work alongside a business team to build AI applications, RAG and agent workflows, integrate existing systems, evaluate behavior, deploy, and iterate on operational needs. | `/services#ai-forward-deployed-engineering` |
| AI infrastructure & environment setup | Set up cloud or self-hosted model serving, retrieval/vector stores, secure access, deployment pipelines, observability, and cost controls.                                 | `/services#ai-infrastructure`               |
| CDP & integration                     | Connect CRM, product, support, and operational data into consistent customer context.                                                                                      | `/services#cdp`                             |
| Customer identity                     | Design CIAM, Auth0/SSO integration, account creation, and sign-in journeys.                                                                                                | `/services#customer`                        |
| Analytics & AI                        | Understand customer journeys and connect useful insights to workflows and automation.                                                                                      | `/services#analytics`                       |
| Consent & preferences                 | Respect customer choices across communication preferences, subscriptions, and the data lifecycle.                                                                          | `/services#consent`                         |

The first two capabilities are featured on the homepage and Services page. Six illustrative use cases cover these areas and a supporting fintech example. These are service descriptions and examples, not claims of completed customer engagements or guaranteed outcomes.

## Content sources

- [`src/lib/site.ts`](../src/lib/site.ts): capability descriptions, tags, IDs/slugs, process steps, shared navigation destinations.
- [`src/components/Hero.tsx`](../src/components/Hero.tsx), [`Services.tsx`](../src/components/Services.tsx), [`UseCases.tsx`](../src/components/UseCases.tsx), and [`CTA.tsx`](../src/components/CTA.tsx): presentation and supporting copy.
- [`src/lib/seo.ts`](../src/lib/seo.ts): page descriptions, canonical metadata, organization and service structured data. Service entries derive from the capability data.
- [`src/lib/support-content.ts`](../src/lib/support-content.ts): public support answers; these also appear in FAQ structured data and `/llms.txt`.
- [`public/bun2too/`](../public/bun2too/): official wordmark, rabbit mark, and icons. Preserve their artwork and proportions.

When a capability changes, keep these surfaces aligned. Slugs are explicit so adding two AI services does not create duplicate `id="ai"` anchors. Keep existing customer-technology anchors stable.

## Delivery story

The process is discover, design, deliver, and evolve. Connect AI implementation to business workflows and operating needs. Infrastructure is an important capability in its own right: the work includes establishing an environment that a customer's team can run, rather than only demonstrating a model.

Public copy should remain concrete about what the service helps with. Do not invent customers, certifications, performance statistics, commercial commitments, vendor partnerships, or completed case studies. Keep fintech experiments distinct from personalized investment recommendations.

## Relationship to customer support

Current website support consists of FAQs and private customer inquiries. Open WebUI is the planned future AI platform, but no AI chat or model connection is currently implemented. Updating service content should keep public FAQs and discovery copy aligned; it does not configure an AI service. Follow [support setup](support.md) for current inquiry behavior and future integration boundaries.
