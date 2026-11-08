import type { MetadataRoute } from "next";
import { absoluteUrl, indexable } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/account", "/insights/signup"];
  return {
    rules: indexable
      ? [
          { userAgent: "*", allow: "/", disallow },
          {
            userAgent: [
              "OAI-SearchBot",
              "ChatGPT-User",
              "Claude-SearchBot",
              "Claude-User",
              "PerplexityBot",
            ],
            allow: "/",
            disallow,
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
