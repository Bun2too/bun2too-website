import { safeCmsHref } from "./cms-links";
import seed from "@/content/website-seed.json";
import {
  blockKinds,
  type CmsAction,
  type CmsArtwork,
  type CmsBlock,
  type CmsCard,
  type CmsFaq,
  type CmsPage,
  type CmsSite,
  type RichDocument,
  type RichNode,
} from "./cms-types";

type RecordValue = Record<string, unknown>;
export type DeliveryEntry = {
  sys: { id: string; contentType?: { sys: { id: string } } };
  fields: RecordValue;
};
export type DeliveryResponse = {
  items: DeliveryEntry[];
  includes?: { Entry?: DeliveryEntry[]; Asset?: DeliveryEntry[] };
  total?: number;
};
const object = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const string = (value: unknown, max = 10000) =>
  typeof value === "string" ? value.slice(0, max) : "";
const strings = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, 60)
        .map((item) => item.slice(0, 256))
    : [];
const emptyRich: RichDocument = { nodeType: "document", data: {}, content: [] };
const identifier = (value: unknown) =>
  string(object(object(value).sys).id, 100);

export function isCmsPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(value) &&
    !/^\/(api|account|admin|auth|settings|workspace|_next)(\/|$)/.test(value) &&
    !value.startsWith("/insights/")
  );
}

export class CmsGraph {
  private entries: Map<string, DeliveryEntry>;
  private assets: Map<string, DeliveryEntry>;
  constructor(response: DeliveryResponse) {
    this.entries = new Map(
      [...(response.includes?.Entry || []), ...response.items].map((entry) => [
        entry.sys.id,
        entry,
      ]),
    );
    this.assets = new Map(
      (response.includes?.Asset || []).map((asset) => [asset.sys.id, asset]),
    );
  }
  entry(value: unknown, type?: string) {
    const entry = this.entries.get(
      typeof value === "string" ? value : identifier(value),
    );
    return entry && (!type || entry.sys.contentType?.sys.id === type)
      ? entry
      : undefined;
  }
  action(value: unknown): CmsAction | undefined {
    const entry = this.entry(value, "b2tAction");
    if (!entry) return;
    const f = entry.fields;
    if (
      !["link", "inquiry", "email", "cookieSettings"].includes(string(f.kind))
    )
      return;
    const kind = f.kind as CmsAction["kind"];
    const href = safeCmsHref(f.href);
    if (!string(f.label) || (kind === "link" && !href)) return;
    return {
      id: entry.sys.id,
      label: string(f.label, 256),
      kind,
      href,
      variant: ["lime", "outline", "cream", "text"].includes(string(f.variant))
        ? (f.variant as CmsAction["variant"])
        : "text",
    };
  }
  artwork(value: unknown): CmsArtwork | undefined {
    const entry = this.entry(value, "b2tArtwork");
    if (!entry) return;
    const f = entry.fields;
    const asset = this.assets.get(identifier(f.image));
    const file = object(asset?.fields.file);
    const details = object(object(file.details).image);
    let url = string(file.url);
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^\/images\/artwork\/[a-z-]+\.webp$/.test(url)) {
      try {
        const u = new URL(url);
        if (
          u.protocol !== "https:" ||
          !["images.ctfassets.net", "images.eu.ctfassets.net"].includes(
            u.hostname,
          ) ||
          u.username ||
          u.password
        )
          return;
      } catch {
        return;
      }
    }
    if (
      !string(f.alt) ||
      typeof details.width !== "number" ||
      typeof details.height !== "number" ||
      details.width <= 0 ||
      details.height <= 0
    )
      return;
    return {
      id: entry.sys.id,
      key: string(f.key),
      url,
      width: details.width,
      height: details.height,
      alt: string(f.alt, 256),
      label: string(f.label, 256),
      caption: string(f.caption, 256),
    };
  }
  card(value: unknown): CmsCard | undefined {
    const entry = this.entry(value, "b2tCard");
    if (!entry) return;
    const f = entry.fields;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(string(f.slug)) || !string(f.title))
      return;
    return {
      id: entry.sys.id,
      slug: string(f.slug),
      number: string(f.number),
      icon: string(f.icon),
      eyebrow: string(f.eyebrow),
      title: string(f.title),
      body: string(f.body),
      detail: string(f.detail),
      tags: strings(f.tags),
      featured: f.featured === true,
    };
  }
  faq(value: unknown): CmsFaq | undefined {
    const entry = this.entry(value, "b2tFaq");
    if (!entry) return;
    const f = entry.fields;
    const path = safeCmsHref(f.path);
    if (!string(f.question) || !string(f.answer) || !path) return;
    return {
      id: entry.sys.id,
      question: string(f.question, 256),
      answer: string(f.answer),
      path,
    };
  }
  rich(value: unknown): RichDocument {
    if (object(value).nodeType !== "document") return emptyRich;
    let count = 0;
    const walk = (value: unknown, depth: number): RichNode | undefined => {
      if (++count > 3000 || depth > 16) return;
      const n = object(value);
      const nodeType = string(n.nodeType, 40);
      if (nodeType === "text")
        return {
          nodeType,
          value: string(n.value, 50000),
          marks: Array.isArray(n.marks)
            ? (n.marks.filter((mark) =>
                ["bold", "italic", "underline", "code"].includes(
                  string(object(mark).type),
                ),
              ) as { type: string }[])
            : [],
          data: {},
        };
      const content = Array.isArray(n.content)
        ? n.content.flatMap((child) => {
            const result = walk(child, depth + 1);
            return result ? [result] : [];
          })
        : [];
      if (nodeType === "hyperlink") {
        const uri = safeCmsHref(object(n.data).uri);
        return uri
          ? { nodeType, content, data: { uri } }
          : { nodeType: "document", content, data: {} };
      }
      if (nodeType === "embedded-entry-inline") {
        const action = this.action(object(n.data).target);
        return action ? { nodeType, data: { action }, content: [] } : undefined;
      }
      return [
        "document",
        "paragraph",
        "heading-1",
        "heading-2",
        "heading-3",
        "heading-4",
        "heading-5",
        "heading-6",
        "unordered-list",
        "ordered-list",
        "list-item",
        "blockquote",
        "hr",
        "table",
        "table-row",
        "table-cell",
        "table-header-cell",
      ].includes(nodeType)
        ? { nodeType, content, data: {} }
        : undefined;
    };
    const result = walk(value, 0);
    return result
      ? { ...result, nodeType: "document", content: result.content || [] }
      : emptyRich;
  }
  block(value: unknown, seen = new Set<string>()): CmsBlock | undefined {
    const entry = this.entry(value, "b2tBlock");
    if (!entry || seen.has(entry.sys.id) || seen.size > 8) return;
    seen = new Set([...seen, entry.sys.id]);
    const f = entry.fields;
    if (!blockKinds.includes(f.kind as CmsBlock["kind"])) return;
    const resolve = <T>(
      value: unknown,
      parse: (link: unknown) => T | undefined,
    ) =>
      Array.isArray(value)
        ? value.slice(0, 100).flatMap((link) => {
            const result = parse(link);
            if (!result)
              throw new Error("Unpublished or invalid CMS reference");
            return [result];
          })
        : [];
    return {
      id: entry.sys.id,
      kind: f.kind as CmsBlock["kind"],
      variant: string(f.variant) || "default",
      anchor: /^[a-z0-9-]*$/.test(string(f.anchor)) ? string(f.anchor) : "",
      eyebrow: string(f.eyebrow, 256),
      heading: this.rich(f.heading),
      body: this.rich(f.body),
      note: this.rich(f.note),
      labels: strings(f.labels),
      artwork: f.artwork ? this.artwork(f.artwork) : undefined,
      items: resolve(f.items, (v) => this.card(v)),
      faqs: resolve(f.faqs, (v) => this.faq(v)),
      actions: resolve(f.actions, (v) => this.action(v)),
      secondary: f.secondary ? this.block(f.secondary, seen) : undefined,
    };
  }
  page(value: unknown): CmsPage | undefined {
    const entry = this.entry(value, "b2tPage");
    if (!entry) return;
    const f = entry.fields;
    if (
      !isCmsPath(f.path) ||
      !string(f.seoTitle) ||
      !Array.isArray(f.blocks) ||
      !f.blocks.length ||
      !["default", "legal", "support", "insights"].includes(string(f.layout))
    )
      return;
    const blocks = f.blocks.map((link) => this.block(link));
    if (blocks.some((block) => !block)) return;
    return {
      id: entry.sys.id,
      path: f.path,
      seoTitle: string(f.seoTitle, 256),
      seoDescription: string(f.seoDescription),
      layout: f.layout as CmsPage["layout"],
      blocks: blocks as CmsBlock[],
    };
  }
  pages() {
    return [...this.entries.values()].flatMap((entry) => {
      if (entry.sys.contentType?.sys.id !== "b2tPage") return [];
      const page = this.page(entry.sys.id);
      return page ? [page] : [];
    });
  }
  site(): CmsSite | undefined {
    const entry = [...this.entries.values()].find(
      (entry) =>
        entry.sys.contentType?.sys.id === "b2tSite" &&
        entry.fields.key === "website",
    );
    if (!entry) return;
    const f = entry.fields;
    const actions = (value: unknown) =>
      Array.isArray(value)
        ? value.flatMap((v) => {
            const action = this.action(v);
            if (!action || action.kind !== "link")
              throw new Error("Invalid navigation reference");
            return [action];
          })
        : [];
    return {
      tagline: string(f.tagline),
      slogan: string(f.slogan),
      navigation: actions(f.navigation),
      footerLinks: actions(f.footerLinks),
      legalLinks: actions(f.legalLinks),
    };
  }
}

export function seedDelivery(): DeliveryResponse {
  return {
    items: seed.entries.map((entry) => ({
      sys: { id: entry.id, contentType: { sys: { id: entry.type } } },
      fields: entry.fields,
    })),
    includes: {
      Asset: seed.assets.map((asset) => ({
        sys: { id: asset.id },
        fields: {
          file: {
            url: asset.localPath,
            details: { image: { width: asset.width, height: asset.height } },
          },
        },
      })),
    },
  };
}
export const localCms = new CmsGraph(seedDelivery());
export function richTextPlain(document: RichNode): string {
  return document.nodeType === "text"
    ? document.value || ""
    : (document.content || []).map(richTextPlain).join("");
}
