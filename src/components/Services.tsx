import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function Services({ full = false }: { full?: boolean }) {
  const block = await getCmsBlock(
    `b2t-block-services-${full ? "full" : "home"}`,
  );
  return block ? <CmsBlockView block={block} /> : null;
}
