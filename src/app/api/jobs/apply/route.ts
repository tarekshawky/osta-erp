import { NextRequest, NextResponse } from "next/server";
import { looksLikeBot } from "@/lib/forms/forms";
import { applicationSchema } from "@/lib/jobs/schema";
import { clientIp, submitApplication } from "@/lib/jobs/applications";
import { getJobSettings } from "@/lib/jobs/service";
import { verifyTurnstile } from "@/lib/jobs/turnstile";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > 20_000) return json({ error: { code: "too_large", message: "That submission is too large." } }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: { code: "invalid_request", message: "Request body must be valid JSON." } }, 400);
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug) return json({ error: { code: "invalid_request", message: "A job is required." } }, 400);

  // Bots get a normal-looking success and nothing is stored.
  if (looksLikeBot(body.website, body.elapsedMs)) return json({ data: { code: "APP-000000" } });

  const settings = await getJobSettings();
  const parsed = applicationSchema({ minPhotos: settings.minPhotos, maxPhotos: settings.maxPhotos }).safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
    return json({ error: { code: "validation", message: Object.values(fields)[0] ?? "Please check the form.", fields } }, 422);
  }

  const ip = clientIp(request.headers);
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) return json({ error: { code: "captcha", message: "Please confirm you are not a robot and try again." } }, 400);

  const result = await submitApplication(slug, parsed.data, ip);
  if (result.ok) return json({ data: { code: result.code } });
  const status = { closed: 409, rate_limited: 429, duplicate: 409, validation: 422, photos: 422 }[result.reason];
  return json({ error: { code: result.reason, message: result.message, fields: result.fields, applicationCode: result.code } }, status);
}
