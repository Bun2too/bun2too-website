export type RichNode = {
  nodeType: string;
  value?: string;
  marks?: { type: string }[];
  data?: Record<string, unknown>;
  content?: RichNode[];
};
export type RichDocument = RichNode & {
  nodeType: "document";
  content: RichNode[];
};
export type CmsAction = {
  id: string;
  label: string;
  href: string;
  kind: "link" | "inquiry" | "email" | "cookieSettings";
  variant: "lime" | "outline" | "cream" | "text";
};
export type CmsArtwork = {
  id: string;
  key: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  label: string;
  caption: string;
};
export type CmsCard = {
  id: string;
  slug: string;
  number: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
  tags: string[];
  featured: boolean;
};
export type CmsFaq = {
  id: string;
  question: string;
  answer: string;
  path: string;
};
export const blockKinds = [
  "hero",
  "intro",
  "focusStrip",
  "services",
  "approach",
  "process",
  "useCases",
  "insightsPromotion",
  "newsletter",
  "cta",
  "faq",
  "richText",
  "insightsFeed",
] as const;
export type CmsBlock = {
  id: string;
  kind: (typeof blockKinds)[number];
  variant: string;
  anchor: string;
  eyebrow: string;
  heading: RichDocument;
  body: RichDocument;
  note: RichDocument;
  labels: string[];
  artwork?: CmsArtwork;
  items: CmsCard[];
  faqs: CmsFaq[];
  actions: CmsAction[];
  secondary?: CmsBlock;
};
export type CmsPage = {
  id: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  layout: "default" | "legal" | "support" | "insights";
  blocks: CmsBlock[];
};
export type CmsSite = {
  tagline: string;
  slogan: string;
  navigation: CmsAction[];
  footerLinks: CmsAction[];
  legalLinks: CmsAction[];
};
