"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { site } from "@/lib/site";
import Icon from "./Icon";
import BrandLogo from "./BrandLogo";
import { authConfigured } from "@/lib/auth-config";
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [loginError, setLoginError] = useState(false);
  const links = [
    ["Services", "/services"],
    ["Our process", "/process"],
    ["Use cases", "/usecases"],
  ];
  return (
    <header className="site-header">
      <nav aria-label="Main navigation" className="nav shell">
        <Link
          className="brand-home"
          href="/"
          onClick={() => setOpen(false)}
          aria-label="Bun2Too home"
        >
          <BrandLogo />
        </Link>
        <div className={`nav-links ${open ? "is-open" : ""}`} id="main-menu">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <a
            href={site.articles}
            aria-current={pathname.startsWith("/insights") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Insights
          </a>
        </div>
        <div className="nav-end">
          {!authConfigured ? (
            <Link href="/account" className="nav-login">
              Account
            </Link>
          ) : isAuthenticated ? (
            <Link href="/account" className="nav-login">
              My account
            </Link>
          ) : (
            <button
              type="button"
              className="nav-login"
              disabled={isLoading}
              onClick={() => {
                setLoginError(false);
                void loginWithRedirect({
                  appState: { returnTo: "/account" },
                }).catch(() => setLoginError(true));
              }}
            >
              {isLoading ? "Loading…" : "Log in"}
            </button>
          )}
          <Link href="/contact" className="nav-contact">
            Let’s connect ↗
          </Link>
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </nav>
      {loginError && (
        <p role="alert" className="shell small">
          Sign-in could not start. Please try again from{" "}
          <Link href="/account">your account</Link>.
        </p>
      )}
    </header>
  );
}
