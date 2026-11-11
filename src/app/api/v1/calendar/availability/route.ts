import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { availability, parseLines } from "@/lib/calendar/public";
import { isDayKey } from "@/lib/calendar/time";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Which days and times can be booked for this emirate and these services. Times only: team names are never returned. When no team of the
// calendar covers the choice, `managed` is false and the website falls back to its plain date and time fields.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const regionId = q.get("regionId") ?? "";
  const lines = parseLines(q.get("lines"));
  const from = q.get("from") ?? undefined;
  const days = q.get("days") ? Number(q.get("days")) : undefined;
  if (!regionId || regionId.length > 64 || !lines || (from && !isDayKey(from)) || (days !== undefined && !Number.isFinite(days))) return apiError("invalid_request", "Choose the emirate and the services.", 400);
  const data = await availability({ regionId, lines, from, days });
  return apiSuccess(data);
}
