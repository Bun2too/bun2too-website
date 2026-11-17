import { handleSupportChat } from "@/lib/support-chat";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleSupportChat(request);
}
