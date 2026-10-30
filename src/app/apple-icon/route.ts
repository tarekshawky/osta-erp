import { faviconResponse } from "@/lib/favicon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return faviconResponse(180, request.url);
}
