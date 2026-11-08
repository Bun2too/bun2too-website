export const site = {
  name: "Bun2Too",
  legalEntity: "Bun2too, Inc.",
  legalEmail: "info@bun2too.com",
  articles: "/insights",
  github: "https://github.com/Bun2too",
};
export const capabilities = [
  {
    id: "01",
    slug: "ai-forward-deployed-engineering",
    featured: true,
    icon: "engineering",
    title: "Build useful AI, with your team.",
    short: "AI forward-deployed engineering",
    description:
      "Work alongside your team to turn business problems into production AI applications. We build RAG and agent workflows, connect them to existing systems, and iterate against real operational needs.",
    tags: [
      "Embedded engineering",
      "AI applications & agents",
      "RAG integration",
    ],
  },
  {
    id: "02",
    slug: "ai-infrastructure",
    featured: true,
    icon: "infrastructure",
    title: "Give AI a dependable foundation.",
    short: "AI infrastructure & environment setup",
    description:
      "Set up the environments behind AI: model serving, retrieval and vector data stores, secure access, deployment pipelines, observability, and cost controls. Build a foundation your team can operate in the cloud or on your own infrastructure.",
    tags: [
      "Cloud & self-hosted AI",
      "Model serving & retrieval",
      "Deployment & operations",
    ],
  },
  {
    id: "03",
    slug: "cdp",
    icon: "data",
    title: "Customer data, connected.",
    short: "CDP & integration",
    description:
      "Bring scattered customer signals into a useful, consistent view. Connect your CDP, CRM, product, and operational systems with dependable data pipelines.",
    tags: ["Customer data platforms", "Event pipelines", "Data quality"],
  },
  {
    id: "04",
    slug: "customer",
    icon: "identity",
    title: "Identity that opens doors.",
    short: "Customer identity",
    description:
      "Make signing in feel effortless. Design customer identity and access management (CIAM), single sign-on, and secure account journeys around the people using them.",
    tags: ["CIAM & Auth0", "Single sign-on", "Account journeys"],
  },
  {
    id: "05",
    slug: "analytics",
    icon: "insight",
    title: "Signals into understanding.",
    short: "Analytics & AI",
    description:
      "Understand customer journeys and turn data into practical decisions. Build analytics, useful AI workflows, and automation that support your team.",
    tags: ["Journey analytics", "Customer insights", "AI automation"],
  },
  {
    id: "06",
    slug: "consent",
    icon: "consent",
    title: "Trust, built into the system.",
    short: "Consent & preferences",
    description:
      "Give customers a clear choice about their data. Connect consent, communication preferences, and subscription states across the customer lifecycle.",
    tags: ["Consent management", "Preference centers", "Data governance"],
  },
];
export const processSteps = [
  {
    title: "Understand the whole journey.",
    label: "Discover",
    description:
      "Map customer touchpoints, existing systems, identity flows, and data responsibilities. Agree on a focused problem and a useful measure of success.",
    deliverable: "Journey map & agreed outcomes",
  },
  {
    title: "Connect the right pieces.",
    label: "Design",
    description:
      "Design the architecture, integration contracts, and consent model together. Make the tradeoffs visible before moving into delivery.",
    deliverable: "Architecture & delivery plan",
  },
  {
    title: "Build something that works.",
    label: "Deliver",
    description:
      "Implement in small increments. Test data quality, sign-in journeys, accessibility, and subscription behavior before releasing changes.",
    deliverable: "Tested integrations & working journeys",
  },
  {
    title: "Learn. Improve. Repeat.",
    label: "Evolve",
    description:
      "Monitor the experience after launch, document how it runs, and use what you learn to choose the next improvement.",
    deliverable: "Operational handover & next steps",
  },
];
