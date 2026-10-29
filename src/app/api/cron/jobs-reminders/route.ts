import { NextRequest, NextResponse } from "next/server";
import { runJobReminders } from "@/lib/jobs/reminders";
import { runRetention } from "@/lib/jobs/applications";

export const dynamic = "force-dynamic";

// Daily (see vercel.json). Secured with CRON_SECRET: Vercel Cron sends it as "Authorization: Bearer <secret>".
// Idempotent: a reminder that was already created is never created twice. Also runs the retention cleanup and removes
// photos that were uploaded but never submitted.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reminders = await runJobReminders();
  const retention = await runRetention();
  return NextResponse.json({ reminders, retention });
}
