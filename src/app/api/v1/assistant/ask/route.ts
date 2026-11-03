import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { hashIp } from "@/lib/forms/forms";
import { createAssistant, MAX_QUESTION } from "@/lib/assistant/answer";
import { assistantData } from "@/lib/assistant/data";
import { ASSISTANT_LIMIT } from "@/lib/assistant/limits";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

const Body = z.object({ text: z.string().trim().min(1).max(MAX_QUESTION), lang: z.enum(["en", "ar"]).default("en") });

// Public, free: "ask about our services". Answers from the website's own data: no AI service, no key, no cost.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 2000) return apiError("too_large", "That message is too long.", 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return apiError("invalid_request", "Request body must be valid JSON.", 400); }
  const body = Body.safeParse(json);
  if (!body.success) return apiError("invalid_request", `Ask a question in up to ${MAX_QUESTION} characters.`, 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = hashIp(ip);
  const recent = await prisma.aiFinderLog.count({ where: { kind: "assistant", ipHash, createdAt: { gte: new Date(Date.now() - ASSISTANT_LIMIT.windowMs) } } });
  if (recent >= ASSISTANT_LIMIT.max) return apiError("rate_limited", "Too many questions. Please try again in a few minutes.", 429);
  await prisma.aiFinderLog.create({ data: { ipHash, kind: "assistant" } });

  try {
    return apiSuccess(createAssistant(await assistantData()).ask(body.data.text, body.data.lang));
  } catch (err) {
    console.error("[assistant]", err instanceof Error ? err.message : "unknown");
    return apiError("unavailable", "The assistant is not available right now.", 503);
  }
}
