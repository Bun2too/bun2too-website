import { pageMetadata } from "@/lib/seo";
import Articles from "@/components/Articles";
import Newsletter from "@/components/Newsletter";
import { PageHero } from "@/components/PageArtwork";

export const metadata = {
  ...pageMetadata("/insights"),
  robots: { index: false, follow: true },
};
export default function ArticlesPage() {
  return (
    <main id="main-content">
      <PageHero artwork="knowledge-library" className="page-header shell">
        <p className="eyebrow">EXPLORE & LEARN</p>
        <h1 className="page-title">
          Ideas worth
          <br />
          <em>connecting.</em>
        </h1>
        <p className="page-intro">
          Visit our article hub for Bun2Too’s technology explorations and
          experiments.
        </p>
      </PageHero>
      <Articles />
      <Newsletter />
    </main>
  );
}
