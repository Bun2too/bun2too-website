import { proxyInsights } from "@/lib/insights-proxy";
export const POST = (request: Request) => proxyInsights(request, "/insights/push-subscriptions");
