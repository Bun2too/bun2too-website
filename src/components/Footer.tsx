import Link from "next/link";
import BrandLogo from "./BrandLogo";
import { CookieSettingsButton } from "./CookieConsent";
import type { CmsSite } from "@/lib/cms-types";
export default function Footer({ content }: { content: CmsSite }) {
  return (
    <footer className="footer shell">
      <div className="footer-top">
        <div>
          <Link href="/" className="brand-home" aria-label="Bun2Too home">
            <BrandLogo />
          </Link>
          <p>{content.tagline}</p>
        </div>
        <div className="footer-links">
          {content.footerLinks.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              {...(action.href.startsWith("https:")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Bun2Too</span>
        <span>{content.slogan}</span>
        {content.legalLinks.slice(0, 2).map((action) => (
          <Link key={action.id} href={action.href}>
            {action.label}
          </Link>
        ))}
        <CookieSettingsButton />
        {content.legalLinks.slice(2).map((action) => (
          <Link key={action.id} href={action.href}>
            {action.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
