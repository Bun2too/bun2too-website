import { absoluteUrl } from "@/lib/seo";
import { getCmsPage, getCmsPages } from "@/lib/contentful";
export const revalidate = 60;
export async function GET() {
  const publicPages = await getCmsPages();
  const supportFaqs =
    (await getCmsPage("/support"))?.blocks.flatMap((block) => block.faqs) || [];
  const text = [
    "# Bun2Too",
    "",
    "> Customer technology. Human thinking. Bun2Too provides AI forward-deployed engineering, AI infrastructure and environment setup, and connected customer data, identity, analytics, and consent.",
    "",
    "## Official public information",
    ...publicPages
      .filter((p) => p.path !== "/privacy")
      .map(
        (p) => `- [${p.seoTitle}](${absoluteUrl(p.path)}): ${p.seoDescription}`,
      ),
    "",
    "## Common questions",
    ...supportFaqs.map(
      (faq) =>
        `### ${faq.question}\n${faq.answer}\nSource: ${absoluteUrl(faq.path)}\n`,
    ),
    "## Discovery",
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- RSS: ${absoluteUrl("/insights/feed.xml")}`,
    `- Atom: ${absoluteUrl("/insights/feed.atom")}`,
    `- Privacy: ${absoluteUrl("/privacy")}`,
    "",
    "This is an optional public content overview. The linked website pages are the source of truth. Account data and private inquiry records are not public content.",
    "",
  ].join("\n");
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
