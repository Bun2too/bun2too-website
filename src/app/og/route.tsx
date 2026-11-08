import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-static";
export async function GET() {
  const logo = await readFile(
    join(process.cwd(), "public/bun2too/logoHighRes.png"),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#111e1c",
        color: "#f1f0e6",
        padding: "65px 75px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            background: "#f8f5ee",
            padding: "14px 20px",
            borderRadius: 8,
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            width={242}
            height={70}
            alt="Bun2Too"
          />
        </div>
        <span style={{ marginLeft: 35, fontSize: 23, color: "#d0ed9a" }}>
          CUSTOMER TECHNOLOGY
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1.08 }}>
          Better experiences.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            lineHeight: 1.08,
            color: "#d0ed9a",
          }}
        >
          Better connected.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#a6b4aa" }}>
        Customer data · Identity · Analytics & AI · Consent
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
