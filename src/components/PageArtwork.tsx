import Image from "next/image";

const artwork = {
  "connected-intelligence": {
    label: "PEOPLE, DATA & POSSIBILITY",
    caption: "Intelligence, connected.",
    alt: "Sculptural lime intelligence core connected to ivory orbital arches and small data nodes.",
  },
  "ai-foundation": {
    label: "ENGINEERED FOR THE EVERYDAY",
    caption: "A foundation for useful AI.",
    alt: "Architectural AI infrastructure with interconnected green server forms, glass layers, and a floating illuminated cube.",
  },
  "delivery-journey": {
    label: "DISCOVER / DESIGN / DELIVER / EVOLVE",
    caption: "Progress, with purpose.",
    alt: "An ivory pathway connects four sculptural platforms through luminous green gateways.",
  },
  "knowledge-library": {
    label: "CURIOSITY, WITH CONNECTIONS",
    caption: "A new perspective, shared.",
    alt: "Translucent knowledge panels arranged around a luminous sphere, representing connected research and ideas.",
  },
  "human-connection": {
    label: "GOOD THINGS START WITH A CONVERSATION",
    caption: "A little closer to what’s next.",
    alt: "Two ivory architectural arches connected by a luminous green bridge and a warm amber meeting point.",
  },
  "trust-by-design": {
    label: "YOUR IDENTITY / YOUR CHOICES",
    caption: "Trust, built into the experience.",
    alt: "Protective ivory and sage arches surrounding a softly illuminated glass sphere.",
  },
} as const;
export type ArtworkName = keyof typeof artwork;

export default function PageArtwork({
  name,
  compact = false,
  eager = true,
}: {
  name: ArtworkName;
  compact?: boolean;
  eager?: boolean;
}) {
  const art = artwork[name];
  return (
    <figure className={`page-artwork${compact ? " page-artwork-compact" : ""}`}>
      <Image
        src={`/images/artwork/${name}.webp`}
        alt={art.alt}
        width={1536}
        height={1024}
        sizes={
          compact
            ? "(max-width:760px) 100vw, 360px"
            : "(max-width:760px) 100vw, (max-width:1100px) 46vw, 680px"
        }
        loading={eager ? "eager" : "lazy"}
      />
      <figcaption>
        <span>{art.label}</span>
        <span>{art.caption}</span>
      </figcaption>
    </figure>
  );
}

export function PageHero({
  artwork: name,
  children,
  className = "",
}: {
  artwork: ArtworkName;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-visual-header ${className}`}>
      <div className="page-visual-copy">{children}</div>
      <PageArtwork name={name} />
    </header>
  );
}
