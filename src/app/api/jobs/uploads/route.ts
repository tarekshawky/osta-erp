import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/forms/forms";
import { clientIp, UPLOADS_PER_HOUR } from "@/lib/jobs/applications";
import { createUploadToken, PhotoError, processWorkPhoto } from "@/lib/jobs/photos";
import { getJobSettings } from "@/lib/jobs/service";
import { isOpenForApplications } from "@/lib/jobs/status";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// One work photo, sent before the form: checked by its real bytes, resized, stripped of EXIF/GPS and stored privately.
// Returns a short-lived token that the application form sends instead of the file.
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: { code: "invalid_request", message: "Send the photo as a form upload." } }, 400);
  }
  const slug = String(form.get("slug") ?? "");
  const file = form.get("file");
  if (!slug || !(file instanceof File)) return json({ error: { code: "invalid_request", message: "A photo and a job are required." } }, 400);

  const job = await prisma.job.findUnique({ where: { slug }, select: { id: true, status: true, applicationDeadline: true } });
  if (!job || !isOpenForApplications(job)) return json({ error: { code: "closed", message: "Applications for this opportunity are closed." } }, 409);

  const ipHash = hashIp(clientIp(request.headers));
  const recent = await prisma.jobUploadTemp.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= UPLOADS_PER_HOUR) return json({ error: { code: "rate_limited", message: "Too many uploads. Please try again later." } }, 429);

  const settings = await getJobSettings();
  try {
    const photo = await processWorkPhoto(Buffer.from(await file.arrayBuffer()), settings.maxFileMb * 1024 * 1024);
    const row = await prisma.jobUploadTemp.create({
      data: { jobId: job.id, ipHash, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, width: photo.width, height: photo.height, data: new Uint8Array(photo.data), thumb: new Uint8Array(photo.thumb) },
      select: { id: true },
    });
    return json({ data: { token: createUploadToken(row.id, job.id), width: photo.width, height: photo.height } });
  } catch (e) {
    if (e instanceof PhotoError) return json({ error: { code: e.code, message: e.message } }, e.code === "too_large" ? 413 : 400);
    console.error("[jobs] upload failed:", e instanceof Error ? e.message : "unknown");
    return json({ error: { code: "server", message: "The upload failed. Please try again." } }, 500);
  }
}
