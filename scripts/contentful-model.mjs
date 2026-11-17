const symbol = (id, name, required = false, validations = []) => ({
  id,
  name,
  type: "Symbol",
  required,
  validations,
});
const text = (id, name) => ({ id, name, type: "Text" });
const rich = (id, name) => ({
  id,
  name,
  type: "RichText",
  validations: [
    {
      enabledNodeTypes: [
        "heading-1",
        "heading-2",
        "heading-3",
        "heading-4",
        "heading-5",
        "heading-6",
        "ordered-list",
        "unordered-list",
        "hr",
        "blockquote",
        "table",
        "hyperlink",
        "embedded-entry-inline",
      ],
    },
    { enabledMarks: ["bold", "italic", "underline", "code"] },
    {
      nodes: { "embedded-entry-inline": [{ linkContentType: ["b2tAction"] }] },
    },
  ],
});
const choice = (id, name, values, required = false) =>
  symbol(id, name, required, [{ in: values }]);
const entry = (id, name, types, many = false, required = false) =>
  many
    ? {
        id,
        name,
        type: "Array",
        required,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: types }],
        },
      }
    : {
        id,
        name,
        type: "Link",
        linkType: "Entry",
        required,
        validations: [{ linkContentType: types }],
      };
const labels = (id, name) => ({
  id,
  name,
  type: "Array",
  items: { type: "Symbol" },
});
const base = (id, name, description, fields) => ({
  id,
  name,
  description,
  displayField: "name",
  fields: [symbol("name", "Editorial name", true), ...fields].map((field) => ({
    localized: false,
    disabled: false,
    omitted: false,
    ...field,
  })),
});

export const contentTypes = [
  base(
    "b2tAction",
    "Bun2Too · Action / navigation link",
    "Reusable, validated links and approved inquiry/email/cookie controls. No executable code.",
    [
      symbol("label", "Visible label", true),
      symbol("href", "Destination (link actions only)"),
      choice(
        "kind",
        "Action",
        ["link", "inquiry", "email", "cookieSettings"],
        true,
      ),
      choice(
        "variant",
        "Presentation",
        ["lime", "outline", "cream", "text"],
        true,
      ),
    ],
  ),
  base(
    "b2tArtwork",
    "Bun2Too · Artwork",
    "Reusable artwork and accessible captions. Official logo remains in code.",
    [
      symbol("key", "Stable artwork key", true),
      {
        id: "image",
        name: "Image",
        type: "Link",
        linkType: "Asset",
        required: true,
        validations: [{ linkMimetypeGroup: ["image"] }],
      },
      symbol("alt", "Alternative text", true),
      symbol("label", "Eyebrow"),
      symbol("caption", "Caption"),
    ],
  ),
  base(
    "b2tCard",
    "Bun2Too · Service / process / use case card",
    "Structured reusable content. Keep existing service anchors stable.",
    [
      symbol("slug", "Stable anchor", true, [
        { regexp: { pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } },
      ]),
      symbol("number", "Display number"),
      choice("icon", "Icon", [
        "engineering",
        "infrastructure",
        "data",
        "identity",
        "insight",
        "consent",
      ]),
      symbol("eyebrow", "Category / step label"),
      symbol("title", "Heading", true),
      text("body", "Description"),
      symbol("detail", "Deliverable / detail"),
      labels("tags", "Tags"),
      { id: "featured", name: "Featured capability", type: "Boolean" },
    ],
  ),
  base(
    "b2tFaq",
    "Bun2Too · Public FAQ",
    "Used by the visible FAQ, FAQ schema, and public discovery text.",
    [
      symbol("question", "Question", true),
      text("answer", "Answer"),
      symbol("path", "Learn-more path", true),
    ],
  ),
  base(
    "b2tBlock",
    "Bun2Too · Page block",
    "Select a supported layout component and edit its content. Reorder references on a Page. Layout code and transactional consent remain in the application.",
    [
      choice(
        "kind",
        "Component",
        [
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
        ],
        true,
      ),
      choice(
        "variant",
        "Layout variant",
        [
          "default",
          "full",
          "compact",
          "contact",
          "support",
          "insights",
          "legal",
        ],
        true,
      ),
      symbol("anchor", "Optional section anchor"),
      symbol("eyebrow", "Eyebrow"),
      rich("heading", "Heading (italic = emphasis)"),
      rich("body", "Body"),
      rich("note", "Supporting note"),
      labels("labels", "Strip labels / footnotes"),
      entry("artwork", "Artwork", ["b2tArtwork"]),
      entry("items", "Cards in display order", ["b2tCard"], true),
      entry("faqs", "FAQs in display order", ["b2tFaq"], true),
      entry("actions", "Actions in display order", ["b2tAction"], true),
      entry("secondary", "Supporting block", ["b2tBlock"]),
    ],
  ),
  base(
    "b2tPage",
    "Bun2Too · Page",
    "Public route, SEO, page shell, and ordered references to reusable blocks. Publish linked entries and images before the page.",
    [
      symbol("path", "Public path", true, [
        { unique: true },
        { regexp: { pattern: "^/(?:[a-z0-9-]+(?:/[a-z0-9-]+)*)?$" } },
      ]),
      symbol("seoTitle", "SEO title", true),
      text("seoDescription", "SEO description"),
      choice(
        "layout",
        "Page shell",
        ["default", "legal", "support", "insights"],
        true,
      ),
      {
        ...entry(
          "blocks",
          "Page blocks in display order",
          ["b2tBlock"],
          true,
          true,
        ),
        validations: [{ size: { min: 1, max: 60 } }],
      },
    ],
  ),
  base(
    "b2tSite",
    "Bun2Too · Site navigation and footer",
    "Global public chrome. Authentication controls, official logo, legal operator, and cookie behavior remain application-owned.",
    [
      symbol("key", "Singleton key", true, [
        { in: ["website"] },
        { unique: true },
      ]),
      symbol("tagline", "Footer tagline"),
      symbol("slogan", "Footer slogan"),
      entry("navigation", "Main navigation", ["b2tAction"], true),
      entry("footerLinks", "Footer navigation", ["b2tAction"], true),
      entry("legalLinks", "Legal links", ["b2tAction"], true),
    ],
  ),
];

export function validateSeed(seed) {
  const models = new Map(contentTypes.map((type) => [type.id, type]));
  const entries = new Map(seed.entries.map((entry) => [entry.id, entry]));
  const assets = new Set(seed.assets.map((asset) => asset.id));
  if (entries.size !== seed.entries.length)
    throw new Error("Duplicate seed entry ID");
  for (const entry of seed.entries) {
    const model = models.get(entry.type);
    if (!model) throw new Error(`Unknown seed model: ${entry.type}`);
    const fields = new Map(model.fields.map((field) => [field.id, field]));
    for (const [id, value] of Object.entries(entry.fields)) {
      if (!fields.has(id)) throw new Error(`Unknown field ${entry.id}.${id}`);
      if (
        fields.get(id).required &&
        (value === undefined || value === "" || value === null)
      )
        throw new Error(`Missing ${entry.id}.${id}`);
    }
    for (const field of model.fields)
      if (field.required && entry.fields[field.id] === undefined)
        throw new Error(`Missing ${entry.id}.${field.id}`);
    const checkLinks = (value) => {
      if (!value || typeof value !== "object") return;
      if (value.sys?.type === "Link") {
        if (
          !(value.sys.linkType === "Asset"
            ? assets.has(value.sys.id)
            : entries.has(value.sys.id))
        )
          throw new Error(`Unresolved seed link: ${value.sys.id}`);
      } else for (const child of Object.values(value)) checkLinks(child);
    };
    checkLinks(entry.fields);
  }
  return {
    contentTypes: contentTypes.length,
    entries: entries.size,
    assets: assets.size,
  };
}
