import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { hashIp } from "@/lib/forms/forms";
import { candidates, DEFAULT_MODEL, findServices, MAX_TEXT, MIN_TEXT } from "@/lib/ai/serviceFinder";
import { dailyCap, decide, PER_VISITOR } from "@/lib/ai/finderLimits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

const Body = z.object({ text: z.string().trim().min(MIN_TEXT).max(MAX_TEXT), lang: z.enum(["en", "ar"]).default("en") });

// Public: "describe your problem, get the right services". Needs ANTHROPIC_API_KEY on this app; without it (or on any AI error)
// the answer is "ai_unavailable" and the website simply offers the normal service list.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return apiError("ai_unavailable", "The service finder is not available right now.", 503);

  const raw = await request.text();
  if (raw.length > 4000) return apiError("too_large", "That message is too long.", 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return apiError("invalid_request", "Request body must be valid JSON.", 400); }
  const body = Body.safeParse(json);
  if (!body.success) return apiError("invalid_request", `Describe what you need in ${MIN_TEXT} to ${MAX_TEXT} characters.`, 400);

  // Per-visitor limit on a keyed hash of the IP (the IP itself is never stored), and a daily cap for the whole site.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = hashIp(ip);
  const [recent, today] = await Promise.all([
    prisma.aiFinderLog.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - PER_VISITOR.windowMs) } } }),
    prisma.aiFinderLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } }),
  ]);
  const decision = decide(recent, today, dailyCap());
  if (decision === "visitor_limit") return apiError("rate_limited", "Too many requests. Please try again in a few minutes.", 429);
  if (decision === "daily_cap") return apiError("ai_unavailable", "The service finder is not available right now.", 503);
  await prisma.aiFinderLog.create({ data: { ipHash } });

  try {
    const list = await candidates();
    if (list.length === 0) return apiError("ai_unavailable", "The service finder is not available right now.", 503);
    const result = await findServices(new Anthropic({ apiKey }), { text: body.data.text, lang: body.data.lang, candidates: list, model: process.env.AI_FINDER_MODEL?.trim() || DEFAULT_MODEL });
    const byslug = new Map(list.map((c) => [c.slug, c]));
    return apiSuccess({
      matches: result.matches.map((m) => { const c = byslug.get(m.slug)!; return { bookSlug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, category: c.category, reason: m.reason }; }),
      note: result.note,
    });
  } catch (err) {
    console.error("[ai-finder]", err instanceof Error ? err.message : "unknown");
    return apiError("ai_unavailable", "The service finder is not available right now.", 503);
  }
}
