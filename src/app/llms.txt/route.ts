import { absoluteUrl, publicPages } from "@/lib/seo";
import { supportFaqs } from "@/lib/support-content";
export const dynamic = "force-static";
export function GET() {
  const text = [
    "# Bun2Too",
    "",
    "> Customer technology. Human thinking. Bun2Too provides AI forward-deployed engineering, AI infrastructure and environment setup, and connected customer data, identity, analytics, and consent.",
    "",
    "## Official public information",
    ...publicPages
      .filter((p) => p.path !== "/privacy")
      .map((p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.description}`),
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
    "This is an optional public content overview. The linked website pages are the source of truth. Account data, support conversations, and private inquiry records are not public content.",
    "",
  ].join("\n");
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
