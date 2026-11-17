import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function Process({
  compact = false,
}: {
  compact?: boolean;
}) {
  const block = await getCmsBlock("b2t-block-process");
  const intro = await getCmsBlock("b2t-block-process-intro");
  return block ? (
    <CmsBlockView
      block={{
        ...block,
        variant: compact ? "compact" : "default",
        artwork: block.artwork || intro?.artwork,
      }}
    />
  ) : null;
}
