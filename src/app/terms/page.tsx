import ContentPage from "@/components/ContentPage";
import { cmsMetadata } from "@/lib/cms-seo";
export const revalidate = 60;
export async function generateMetadata() {
  return cmsMetadata("/terms");
}
export default function Page() {
  return <ContentPage path="/terms" />;
}
