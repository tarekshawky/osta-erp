import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission, writeAudit } from "@/lib/adminGuard";
import { toCsv, type FormField } from "@/lib/forms/forms";

// CSV of every lead for one form. Personal data: needs leads.view, and each export is audited.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const check = await peekPermission("leads.view");
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.error === "unauthorized" ? 401 : 403 });

  const { id } = await context.params;
  const form = await prisma.cmsForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const fields = form.fields as unknown as FormField[];
  const rows = await prisma.cmsFormSubmission.findMany({ where: { formId: id }, orderBy: { createdAt: "desc" } });

  const csv = toCsv([
    ["Date", "Status", "Language", "Page", ...fields.map((f) => f.label.en), "Notes"],
    ...rows.map((r) => {
      const data = r.data as Record<string, string | boolean>;
      return [r.createdAt.toISOString(), r.status, r.language ?? "", r.sourcePath ?? "", ...fields.map((f) => data[f.key] ?? ""), r.notes];
    }),
  ]);
  await writeAudit(check.admin, "lead.export", "CmsForm", id, null, { rows: rows.length });
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${form.slug}-leads.csv"`, "Cache-Control": "no-store" },
  });
}
