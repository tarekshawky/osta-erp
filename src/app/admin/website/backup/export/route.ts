import { NextResponse } from "next/server";
import { peekPermission, writeAudit } from "@/lib/adminGuard";
import { buildExport } from "@/lib/cms/backupDb";

// Downloads the website content as one JSON file (no leads, customers or image files). Audited.
export async function GET() {
  const check = await peekPermission("company.edit");
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.error === "unauthorized" ? 401 : 403 });
  const bundle = await buildExport();
  await writeAudit(check.admin, "content.export", "Content", null, null, { pages: bundle.pages.length });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="osta-website-content-${stamp}.json"`, "Cache-Control": "no-store" },
  });
}
