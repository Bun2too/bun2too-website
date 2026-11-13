import { notFound } from "next/navigation";
import ContentPage from "@/components/ContentPage";
import { isCmsPath } from "@/lib/cms-content";
import { getCmsPage } from "@/lib/contentful";
import { cmsMetadata } from "@/lib/cms-seo";
export const revalidate = 60;
type Props = { params: Promise<{ slug: string[] }> };
async function publicPath(params: Props["params"]) {
  const path = `/${(await params).slug.join("/")}`;
  if (!isCmsPath(path) || !(await getCmsPage(path))) notFound();
  return path;
}
export async function generateMetadata({ params }: Props) {
  return cmsMetadata(await publicPath(params));
}
export default async function Page({ params }: Props) {
  return <ContentPage path={await publicPath(params)} />;
}
