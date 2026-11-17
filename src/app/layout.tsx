import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import SupportLauncher from "@/components/support/SupportLauncher";
import StructuredData from "@/components/StructuredData";
import CookieConsentProvider from "@/components/CookieConsent";
import { organizationSchema, pageMetadata, siteOrigin } from "@/lib/seo";
import "@/styles/globals.css";
import "@/styles/insights.css";
import "@/styles/support.css";
import "@/styles/cookies.css";
import "@/styles/artwork.css";
import { getCmsPage, getCmsSite } from "@/lib/contentful";
export const metadata: Metadata = {
  ...pageMetadata("/"),
  metadataBase: new URL(siteOrigin),
  applicationName: "Bun2Too",
  category: "technology",
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
  title: {
    default: "Bun2Too — Customer technology. Human thinking.",
    template: "%s | Bun2Too",
  },
  description:
    "Connect customer data, identity, analytics, and consent. Bun2Too builds thoughtful customer technology, integrations, and AI workflows.",
  icons: {
    icon: [
      { url: "/bun2too/logo.ico", type: "image/x-icon" },
      { url: "/bun2too/logo.png", type: "image/png", sizes: "180x180" },
    ],
    apple: [{ url: "/bun2too/logo.png", sizes: "180x180", type: "image/png" }],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getCmsSite();
  const home = await getCmsPage("/");
  const organization = {
    ...organizationSchema,
    "@graph": organizationSchema["@graph"].map((item) =>
      item["@type"] === "Organization"
        ? { ...item, description: home?.seoDescription || item.description }
        : item,
    ),
  };
  return (
    <html lang="en">
      <body>
        <StructuredData data={organization} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <CookieConsentProvider>
          <AuthProvider>
            <Navbar navigation={content.navigation} />
            {children}
            <Footer content={content} />
            <SupportLauncher />
          </AuthProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
