import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { hashIp } from "@/lib/forms/forms";
import { candidates, DEFAULT_MODEL, findServices, MAX_TEXT, MIN_TEXT } from "@/lib/ai/serviceFinder";
import { dailyCap, decide, PER_VISITOR } from "@/lib/ai/finderLimits";
import { buildIndex, search } from "@/lib/assistant/search";
import { assistantData } from "@/lib/assistant/data";
import { ASSISTANT_LIMIT } from "@/lib/assistant/limits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

const Body = z.object({ text: z.string().trim().min(MIN_TEXT).max(MAX_TEXT), lang: z.enum(["en", "ar"]).default("en") });

// Free matching, used when there is no ANTHROPIC_API_KEY (or the paid AI is unavailable): the question is matched against the service
// names by the same engine as the free assistant. No AI service and no cost.
async function freeMatches(text: string, ipHash: string) {
  const recent = await prisma.aiFinderLog.count({ where: { kind: "assistant", ipHash, createdAt: { gte: new Date(Date.now() - ASSISTANT_LIMIT.windowMs) } } });
  if (recent >= ASSISTANT_LIMIT.max) return apiError("rate_limited", "Too many requests. Please try again in a few minutes.", 429);
  await prisma.aiFinderLog.create({ data: { ipHash, kind: "assistant" } });
  const data = await assistantData();
  const bySlug = new Map(data.services.map((s) => [s.slug, s]));
  const hits = search(buildIndex(data.services), text, 3);
  return apiSuccess({ matches: hits.map((h) => { const c = bySlug.get(h.service.slug)!; return { bookSlug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, category: c.category, categoryAr: c.categoryAr, reason: "" }; }), note: "" });
}

// Public: "describe your problem, get the right services". With ANTHROPIC_API_KEY on this app, Claude picks the services; without it
// the free matching above does. Either way the website gets the same answer shape.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const raw = await request.text();
  if (raw.length > 4000) return apiError("too_large", "That message is too long.", 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return apiError("invalid_request", "Request body must be valid JSON.", 400); }
  const body = Body.safeParse(json);
  if (!body.success) return apiError("invalid_request", `Describe what you need in ${MIN_TEXT} to ${MAX_TEXT} characters.`, 400);

  // Per-visitor limit on a keyed hash of the IP (the IP itself is never stored), and a daily cap for the whole site.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = hashIp(ip);
  if (!apiKey) {
    try { return await freeMatches(body.data.text, ipHash); } catch (err) { console.error("[ai-finder:free]", err instanceof Error ? err.message : "unknown"); return apiError("ai_unavailable", "The service finder is not available right now.", 503); }
  }
  const [recent, today] = await Promise.all([
    prisma.aiFinderLog.count({ where: { kind: "finder", ipHash, createdAt: { gte: new Date(Date.now() - PER_VISITOR.windowMs) } } }),
    prisma.aiFinderLog.count({ where: { kind: "finder", createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } }),
  ]);
  const decision = decide(recent, today, dailyCap());
  if (decision === "visitor_limit") return apiError("rate_limited", "Too many requests. Please try again in a few minutes.", 429);
  if (decision === "daily_cap") { try { return await freeMatches(body.data.text, ipHash); } catch { return apiError("ai_unavailable", "The service finder is not available right now.", 503); } }
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
    // the paid AI failed: the free matching still answers
    try { return await freeMatches(body.data.text, ipHash); } catch { return apiError("ai_unavailable", "The service finder is not available right now.", 503); }
  }
}
