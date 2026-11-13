/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.ctfassets.net", pathname: "/**" },
      { protocol: "https", hostname: "images.eu.ctfassets.net", pathname: "/**" },
    ],
  },
  async headers() {
    const canIndex =
      !["dev", "qa", "preview"].includes(process.env.SITE_ENVIRONMENT || "") &&
      !["deploy-preview", "branch-deploy", "dev"].includes(
        process.env.CONTEXT || "",
      ) &&
      new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bun2too.com")
        .protocol === "https:" &&
      ["bun2too.com", "www.bun2too.com"].includes(
        new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bun2too.com")
          .hostname,
      );
    return [
      {
        source: "/:path*",
        headers: [
          ...(!canIndex
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/account",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/insights/signup",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${[
              "https://bun2too.com",
              "https://insights.bun2too.com",
              ...(process.env.INSIGHTS_EMBED_ORIGINS || "")
                .split(",")
                .filter(Boolean),
            ]
              .map((value) => {
                const url = new URL(value.trim());
                if (
                  url.protocol !== "https:" ||
                  url.username ||
                  url.password ||
                  url.pathname !== "/" ||
                  url.search ||
                  url.hash
                )
                  throw new Error("Invalid embed origin configuration");
                return url.origin;
              })
              .join(" ")}`,
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
