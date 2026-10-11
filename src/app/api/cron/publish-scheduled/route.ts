import { NextRequest, NextResponse } from "next/server";
import { promoteDueScheduledPages } from "@/lib/cms/publish";

// Optional: point a scheduler (Vercel Cron, cron-job.org) here every few minutes. Scheduled pages also go live
// lazily the first time the public API is read after their time, so this only makes it prompt.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ published: await promoteDueScheduledPages() });
}
