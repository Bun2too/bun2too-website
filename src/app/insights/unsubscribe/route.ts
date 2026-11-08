import { proxyInsights } from "@/lib/insights-proxy";
export const GET = (request: Request) => proxyInsights(request, "/insights/unsubscribe");
export const POST = GET;
