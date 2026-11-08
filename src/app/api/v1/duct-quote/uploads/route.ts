import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { hashIp } from "@/lib/forms/forms";
import { prisma } from "@/lib/prisma";
import { saveDuctUpload } from "@/lib/ductwork/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function OPTIONS() {
  return corsPreflight();
}

// One drawing or BOQ, sent before the quotation exists. It is checked by its real bytes (PDF, images, XLSX, XLS or DWG only), stored
// privately, and attached to the quotation when it is created.
export async function POST(request: NextRequest) {
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("invalid_request", "Send the file as a form upload.", 400); }
  const file = form.get("file");
  const uploadKey = String(form.get("uploadKey") ?? "");
  const category = String(form.get("category") ?? "");
  if (!(file instanceof File)) return apiError("invalid_request", "Choose a file.", 400);
  const ip = clientIp(request.headers);
  if (await isLimited(prisma, "quoteUpload", ip, uploadKey)) return apiError("rate_limited", "Too many uploads. Please try again later.", 429);
  await recordAttempt(prisma, "quoteUpload", ip, uploadKey);
  const r = await saveDuctUpload(Buffer.from(await file.arrayBuffer()), file.name, uploadKey, category, hashIp(ip));
  if (!r.ok) return apiError("invalid_file", r.error, 400);
  return apiSuccess({ id: r.id, name: r.name, size: r.size, category });
}
