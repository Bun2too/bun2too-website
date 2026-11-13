import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function CmsNewsletter({
  insights = false,
}: {
  insights?: boolean;
}) {
  const block = await getCmsBlock(
    `b2t-block-newsletter${insights ? "-insights" : ""}`,
  );
  return block ? <CmsBlockView block={block} /> : null;
}
