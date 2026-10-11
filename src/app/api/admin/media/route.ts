import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";
import { writeAudit } from "@/lib/adminGuard";
import { MAX_UPLOAD_BYTES, MediaError, processImage, sanitizeFileName } from "@/lib/media/process";

export const runtime = "nodejs";

// Upload one image (multipart field "file", optional "folderId"). Needs the media.manage permission.
export async function POST(request: NextRequest) {
  const check = await peekPermission("media.manage");
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.error === "unauthorized" ? 401 : 403 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 100_000) return NextResponse.json({ error: "The file is larger than 10 MB." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const folderRaw = form?.get("folderId");
  const folderId = typeof folderRaw === "string" && folderRaw ? folderRaw : null;
  if (folderId && !(await prisma.mediaFolder.findUnique({ where: { id: folderId } }))) {
    return NextResponse.json({ error: "Folder not found." }, { status: 400 });
  }

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof MediaError) return NextResponse.json({ error: err.message }, { status: 422 });
    throw err;
  }

  const name = sanitizeFileName(file.name);
  const asset = await prisma.mediaAsset.create({
    data: {
      folderId, name, originalName: name, originalMime: file.type || `image/${processed.originalFormat}`,
      width: processed.width, height: processed.height, originalBytes: file.size,
      uploadedById: check.admin.id, uploadedByName: check.admin.name,
      variants: { create: processed.variants.map((v) => ({ width: v.width, height: v.height, format: v.format, bytes: v.bytes, data: new Uint8Array(v.data) })) },
    },
    select: { id: true, name: true, width: true, height: true },
  });
  await writeAudit(check.admin, "media.upload", "MediaAsset", asset.id, null, { name, width: asset.width, height: asset.height });

  // Absolute URL on the admin's own origin: stable, and works inside the public site's pages.
  const url = `${request.nextUrl.origin}/api/media/${asset.id}`;
  return NextResponse.json({ asset: { ...asset, url } }, { status: 201 });
}
