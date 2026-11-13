import { notFound } from "next/navigation";
import { getCmsPage } from "@/lib/contentful";
import { pageSchema } from "@/lib/seo";
import StructuredData from "./StructuredData";
import CmsBlocks from "./CmsBlocks";

export default async function ContentPage({ path }: { path: string }) {
  const page = await getCmsPage(path);
  if (!page) notFound();
  const contained = page.layout === "support" || path === "/usecases";
  const className =
    page.layout === "legal"
      ? "section shell prose legal-page"
      : contained
        ? "section shell"
        : page.layout === "insights"
          ? "insights-page"
          : undefined;
  const services = page.blocks
    .filter((block) => block.kind === "services")
    .flatMap((block) =>
      block.items.map((item) => ({
        short: item.eyebrow,
        description: item.body,
        slug: item.slug,
      })),
    );
  return (
    <main id="main-content" className={className}>
      <StructuredData
        data={pageSchema(path, {
          title: page.seoTitle,
          description: page.seoDescription,
          ...(services.length ? { services } : {}),
        })}
      />
      <CmsBlocks blocks={page.blocks} contained={contained} />
    </main>
  );
}
