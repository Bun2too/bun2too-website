import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const out = new URL("../docs/artwork/contentful/", import.meta.url);
await mkdir(out, { recursive: true });
const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const text = (x, y, value, size = 20, color = "#d5e1db") =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="Arial,Helvetica,sans-serif">${escape(value)}</text>`;
const box = (x, y, w, h, title, lines, accent = "#d0ed9a") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#1b302a" stroke="#456352"/>${text(x + 22, y + 38, title, 23, accent)}${lines.map((line, i) => text(x + 22, y + 76 + i * 29, line, 18)).join("")}`;
const arrow = (path) =>
  `<path d="${path}" fill="none" stroke="#d0ed9a" stroke-width="3" marker-end="url(#arrow)"/>`;
const canvas = (width, height, title, subtitle, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#d0ed9a" stroke-width="1.4"/></marker></defs><rect width="${width}" height="${height}" fill="#10211c"/>${text(40, 48, title, 32, "#f1f0e6")}${text(40, 82, subtitle, 18)}${body}</svg>`;
const diagrams = {
  "content-model": canvas(
    1440,
    1100,
    "Bun2Too · Contentful content model",
    "Seven reusable entry types. References keep shared copy and presentation aligned.",
    arrow("M210 290V420") +
      arrow("M700 290V390") +
      arrow("M520 540H380") +
      arrow("M880 450H950V220H1000") +
      arrow("M880 535H1000") +
      arrow("M880 640H950V760H1000") +
      arrow("M1380 545H1410V960H1380") +
      box(40, 120, 340, 170, "Site settings · 1", [
        "Navigation + footer",
        "Tagline + slogan",
        "Application controls stay in code",
      ]) +
      box(520, 120, 360, 170, "Page · 10", [
        "Public path + SEO",
        "Page shell",
        "Ordered block references",
      ]) +
      box(520, 390, 360, 300, "Block · 54", [
        "Component + layout variant",
        "Heading + body + note",
        "Artwork, cards, FAQs, actions",
        "Optional supporting block",
        "13 supported component kinds",
      ]) +
      box(40, 420, 340, 210, "Action · 24", [
        "Label + safe destination",
        "Link / inquiry / email / cookies",
        "Button presentation",
        "No HTML or JavaScript fields",
      ]) +
      box(1000, 120, 380, 190, "Card · 16", [
        "6 services + 4 process steps",
        "6 illustrative use cases",
        "Stable slug, copy, tags, icon",
      ]) +
      box(1000, 450, 380, 190, "Artwork · 6", [
        "Image asset reference",
        "Alternative text",
        "Label + caption",
      ]) +
      box(1000, 700, 380, 140, "Public FAQ · 8", [
        "Question + answer + source path",
        "Visible FAQ + JSON-LD + llms.txt",
      ]) +
      box(1000, 890, 380, 140, "Contentful Asset · 6", [
        "Original WebP artwork",
        "1536 × 1024 image files",
      ]) +
      box(40, 800, 840, 180, "Design and security boundary", [
        "Templates, CSS, official logo, login, consent and private data stay in code.",
        "Contentful selects approved blocks, their order and public editorial content.",
        "Insights articles remain in the existing editorial API.",
      ]),
  ),
  "delivery-flow": canvas(
    1440,
    900,
    "Bun2Too · Publishing and delivery",
    "Production uses master. Dev and QA use qa. Only published content reaches the site.",
    arrow("M340 230H400") +
      arrow("M720 230H800") +
      arrow("M1130 320V410") +
      arrow("M800 500H720") +
      arrow("M400 500H340") +
      box(40, 140, 300, 180, "Editor / migration", [
        "Author public content",
        "Publish dependencies first",
        "CMA token: local admin only",
      ]) +
      box(400, 140, 320, 180, "Contentful environments", [
        "master → production",
        "qa → dev and QA",
        "Models + entries + artwork",
      ]) +
      box(800, 140, 530, 180, "Content Delivery API", [
        "Published content only",
        "Delivery token held by the server",
        "Fixed Contentful API host; no visitor data forwarded",
      ]) +
      box(800, 410, 530, 180, "Netlify / Next.js server", [
        "Resolve linked entries and validate content",
        "Render approved React block components",
        "60-second revalidation; committed snapshot fallback",
      ]) +
      box(400, 410, 320, 180, "Server-rendered output", [
        "Page + metadata + schema",
        "Public artwork URLs",
        "No CMS credential in HTML",
      ]) +
      box(40, 410, 300, 180, "Visitor browser", [
        "Established Bun2Too design",
        "Interactive forms stay native",
        "No direct CDA/CMA calls",
      ]) +
      box(40, 700, 1290, 140, "Operational boundaries", [
        "Auth0, private inquiries, CAPTCHA, AI support, cookies, feeds and push keep their existing integration paths.",
        "Preview API is not enabled. Draft review uses the qa publishing workflow; the supplied preview key was rejected.",
      ]),
  ),
  "page-layout": canvas(
    1440,
    1250,
    "Bun2Too · Modular page layout",
    "Homepage example: edit content and reorder block references while retaining the existing templates.",
    box(40, 120, 650, 90, "Global header / Site navigation", []) +
      box(40, 230, 650, 160, "Hero", [
        "Headline + emphasis + introductory copy",
        "Actions + footnotes; official orbit/logo stays in code",
      ]) +
      box(40, 410, 650, 90, "Focus strip", []) +
      box(40, 520, 650, 170, "Services", [
        "Shared capability card references",
        "Featured AI cards + supporting customer technology",
      ]) +
      box(40, 710, 650, 90, "Approach teaser", []) +
      box(40, 820, 650, 90, "Insights promotion", []) +
      box(40, 930, 650, 90, "Newsletter", []) +
      box(40, 1040, 650, 90, "Call to action", []) +
      box(40, 1150, 650, 70, "Global footer / Site navigation", []) +
      box(760, 120, 620, 280, "Page responsibilities", [
        "Path, SEO title and description",
        "Ordered references to blocks",
        "Page shell: default, legal, support or insights",
        "A new public path uses the catch-all CMS route",
        "Application/private routes remain reserved",
        "Legal content retains cookie/email controls",
      ]) +
      box(760, 440, 620, 240, "Block responsibilities", [
        "A supported component kind and variant",
        "Structured Rich Text and supporting copy",
        "Approved actions and shared references",
        "Reusable artwork with accessible text",
        "The same block can appear on several pages",
      ]) +
      box(760, 720, 620, 210, "Application responsibilities", [
        "Visual design, CSS, responsive behavior",
        "Authentication and token validation",
        "Consent wording/version and form processing",
        "Private records, CAPTCHA and rate limits",
      ]) +
      box(760, 970, 620, 220, "Publication contract", [
        "Publish actions, cards, FAQs and images first",
        "Publish blocks, then pages / site settings",
        "Changes appear after revalidation + a request",
        "Unreachable/invalid delivery uses the snapshot",
        "Editorial review still applies to legal/public claims",
      ]),
  ),
};
for (const [name, svg] of Object.entries(diagrams)) {
  await writeFile(new URL(`${name}.svg`, out), svg);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(new URL(`${name}.png`, out).pathname);
}
console.log("Generated three SVG/PNG Contentful design diagrams.");
