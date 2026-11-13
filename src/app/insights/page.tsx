import ContentPage from "@/components/ContentPage";
import { cmsMetadata } from "@/lib/cms-seo";
export const revalidate = 60;
export async function generateMetadata() {
  const metadata = await cmsMetadata("/insights");
  return {
    ...metadata,
    alternates: {
      canonical: "/insights",
      types: {
        "application/rss+xml": "/insights/feed.xml",
        "application/atom+xml": "/insights/feed.atom",
      },
    },
  };
}
export default function Page() {
  return <ContentPage path="/insights" />;
}
