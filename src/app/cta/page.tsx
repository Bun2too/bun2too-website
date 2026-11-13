import { pageMetadata } from "@/lib/seo";
import CTA from "@/components/CTA";
import Newsletter from "@/components/CmsNewsletter";

export const metadata = {
  ...pageMetadata("/contact"),
  robots: { index: false, follow: true },
};
export default function CTAPage() {
  return (
    <main id="main-content">
      <div className="page-header shell">
        <h1 className="page-title">
          Let’s build
          <br />
          <em>better connections.</em>
        </h1>
      </div>
      <CTA />
      <Newsletter />
    </main>
  );
}
