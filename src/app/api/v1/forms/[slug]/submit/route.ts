import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import { notifyFormSubmission } from "@/lib/emailSender";
import { MAX_BODY_BYTES, RATE_LIMIT, hashIp, isRateLimited, looksLikeBot, validateSubmission, type FormField } from "@/lib/forms/forms";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return apiError("too_large", "That submission is too large.", 413);
  let body: { data?: unknown; website?: unknown; elapsedMs?: unknown; language?: unknown; path?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return apiError("invalid_request", "Request body must be valid JSON.", 400);
  }

  const form = await prisma.cmsForm.findFirst({ where: { slug, active: true } });
  if (!form) return apiError("not_found", "Form not found.", 404);

  // Bots get a normal-looking success and nothing is stored, so they learn nothing about what tripped them.
  if (looksLikeBot(body.website, body.elapsedMs)) return apiSuccess({ ok: true });

  // Per-visitor rate limit on a keyed hash of the IP (the IP itself is never stored).
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = hashIp(ip);
  const recent = await prisma.cmsFormSubmission.count({ where: { formId: form.id, ipHash, createdAt: { gte: new Date(Date.now() - RATE_LIMIT.windowMs) } } });
  if (isRateLimited(recent)) return apiError("rate_limited", "Too many submissions. Please try again in a few minutes.", 429);

  const fields = form.fields as unknown as FormField[];
  const result = validateSubmission(fields, body.data);
  if (!result.ok) {
    return Response.json({ error: { code: "validation", message: "Please check the highlighted fields.", fields: result.errors } }, { status: 422, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const language = body.language === "ar" ? "ar" : "en";
  const sourcePath = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;
  await prisma.cmsFormSubmission.create({ data: { formId: form.id, data: result.data, language, sourcePath, ipHash } });

  // A flaky email provider must never lose a lead: it is already saved above.
  try {
    await notifyFormSubmission({
      formName: form.nameEn,
      rows: fields.map((f): [string, string] => [f.label.en, String(result.data[f.key] === true ? "Yes" : result.data[f.key] === false ? "No" : (result.data[f.key] ?? ""))]),
      to: form.recipients,
      sourcePath,
    });
  } catch (err) {
    console.error("[forms] notification failed:", err instanceof Error ? err.message : "unknown");
  }
  return apiSuccess({ ok: true });
}
