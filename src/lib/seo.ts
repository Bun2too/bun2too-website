import type { Metadata } from "next";
import { capabilities, site } from "./site";
export const siteOrigin = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://bun2too.com",
).origin;
export function isIndexableSite(
  origin: string,
  environment = "",
  context = "",
) {
  return (
    !["dev", "qa", "preview"].includes(environment) &&
    !["deploy-preview", "branch-deploy", "dev"].includes(context) &&
    new URL(origin).protocol === "https:" &&
    ["bun2too.com", "www.bun2too.com"].includes(new URL(origin).hostname)
  );
}
export const indexable = isIndexableSite(
  siteOrigin,
  process.env.SITE_ENVIRONMENT,
  process.env.CONTEXT,
);
export const absoluteUrl = (path: string) =>
  new URL(path, `${siteOrigin}/`).href;
export const publicPages = [
  {
    path: "/",
    title: "AI engineering & connected customer technology",
    description:
      "Bun2Too helps businesses build and deploy AI, set up AI infrastructure, and connect customer data, identity, analytics, and consent.",
  },
  {
    path: "/services",
    title: "AI engineering, infrastructure & customer technology services",
    description:
      "Build and deploy AI with Bun2Too: forward-deployed engineering, AI environments, CDP integration, CIAM, analytics, and consent.",
  },
  {
    path: "/process",
    title: "Our process: discover, design, deliver & evolve",
    description:
      "How Bun2Too maps customer journeys, designs connected systems, tests integrations and identity flows, and improves customer technology after launch.",
  },
  {
    path: "/usecases",
    title: "AI engineering, infrastructure & customer technology use cases",
    description:
      "Explore AI application delivery, infrastructure setup, unified customer profiles, secure sign-in, analytics, consent, and applied fintech experiments.",
  },
  {
    path: "/insights",
    title: "Insights on AI, engineering & customer technology",
    description:
      "Read Bun2Too field notes on AI, software engineering, customer data, identity, and consent, with sources and practical lessons.",
  },
  {
    path: "/contact",
    title: "Contact Bun2Too about customer technology",
    description:
      "Discuss AI engineering, infrastructure setup, or customer technology with Bun2Too. Ask the support assistant or submit a private inquiry.",
  },
  {
    path: "/support",
    title: "Customer support & frequently asked questions",
    description:
      "Get help with Bun2Too services, applications, accounts, and subscriptions. Ask our knowledge-based assistant or send the team a private inquiry.",
  },
  {
    path: "/privacy",
    title: "Privacy, consent & support data",
    description:
      "Learn how Bun2Too handles identity, email preferences, support conversations, inquiries, and your consent choices.",
  },
  {
    path: "/cookies",
    title: "Cookie policy & browser preferences",
    description:
      "Manage necessary storage, optional reading preferences, Google Analytics, and marketing choices on Bun2Too. Optional categories start off.",
  },
  {
    path: "/terms",
    title: "Website terms & conditions",
    description:
      "Terms for using Bun2too, Inc.’s website, Insights, accounts, and AI support, including acceptable use, intellectual property, and service limitations.",
  },
] as const;
export function pageMetadata(
  path: string,
  title?: string,
  description?: string,
): Metadata {
  const page = publicPages.find((p) => p.path === path);
  const heading = title || page?.title || "Bun2Too";
  const summary =
    description || page?.description || publicPages[0].description;
  return {
    title: heading,
    description: summary,
    alternates: { canonical: absoluteUrl(path) },
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: "Bun2Too",
      locale: "en_US",
      title: heading,
      description: summary,
      url: absoluteUrl(path),
      images: [
        {
          url: absoluteUrl("/og"),
          width: 1200,
          height: 630,
          alt: "Bun2Too — Customer technology. Human thinking.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: heading,
      description: summary,
      images: [absoluteUrl("/og")],
    },
  };
}
export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: "Bun2Too",
      url: siteOrigin,
      description: publicPages[0].description,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/bun2too/logoHighRes.png"),
        width: 1003,
        height: 290,
      },
      sameAs: [site.github],
      knowsAbout: [
        "AI forward-deployed engineering",
        "AI infrastructure and environment setup",
        "Retrieval-augmented generation",
        "Customer data platforms",
        "Customer identity and access management",
        "Customer analytics",
        "Consent management",
        "AI automation",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: absoluteUrl("/support"),
        availableLanguage: "English",
      },
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: "Bun2Too",
      url: siteOrigin,
      inLanguage: "en",
      publisher: { "@id": absoluteUrl("/#organization") },
    },
  ],
};
export function pageSchema(path: string) {
  const page = publicPages.find((p) => p.path === path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":
          path === "/contact"
            ? "ContactPage"
            : path === "/insights"
              ? "CollectionPage"
              : "WebPage",
        "@id": absoluteUrl(`${path}#webpage`),
        url: absoluteUrl(path),
        name: page?.title,
        description: page?.description,
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@id": absoluteUrl("/#organization") },
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Bun2Too",
            item: absoluteUrl("/"),
          },
          ...(path === "/"
            ? []
            : [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: page?.title || path,
                  item: absoluteUrl(path),
                },
              ]),
        ],
      },
      ...(path === "/services"
        ? [
            {
              "@type": "ItemList",
              itemListElement: capabilities.map((item, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "Service",
                  name: item.short,
                  description: item.description,
                  provider: { "@id": absoluteUrl("/#organization") },
                  url: absoluteUrl(`/services#${item.slug}`),
                },
              })),
            },
          ]
        : []),
    ],
  };
}
