import Link from "next/link";
import { site } from "@/lib/site";
import BrandLogo from "./BrandLogo";
import { CookieSettingsButton } from "./CookieConsent";
export default function Footer() {
  return (
    <footer className="footer shell">
      <div className="footer-top">
        <div>
          <Link href="/" className="brand-home" aria-label="Bun2Too home">
            <BrandLogo />
          </Link>
          <p>People. Data. Possibility.</p>
        </div>
        <div className="footer-links">
          <Link href="/services">What we build</Link>
          <Link href="/process">Our process</Link>
          <Link href="/contact">Get in touch</Link>
          <Link href="/support">Support & FAQs</Link>
          <Link href={site.articles}>Insights</Link>
          <a href={site.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Bun2Too</span>
        <span>CUSTOMER TECHNOLOGY. HUMAN THINKING.</span>
        <Link href="/privacy">Privacy & consent</Link>
        <Link href="/cookies">Cookies</Link>
        <CookieSettingsButton />
        <Link href="/terms">Terms & conditions</Link>
      </div>
    </footer>
  );
}
