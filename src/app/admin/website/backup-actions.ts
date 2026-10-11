"use server";

import { revalidatePath } from "next/cache";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { MAX_IMPORT_BYTES, validateBundle } from "@/lib/cms/backup";
import { applyBundle, type ImportReport } from "@/lib/cms/backupDb";
import { revalidateSite } from "@/lib/cms/publish";

export type ImportResult =
  | { ok: false; errors: string[] }
  | { ok: true; applied: false; summary: Record<string, number> }
  | { ok: true; applied: true; report: ImportReport };

// Import overwrites site-wide content, so it is Owner-only (integrations.manage). "check" validates and summarises without
// writing anything; "apply" does the same validation again on the server, then writes everything in one transaction.
export async function importContent(json: string, mode: "check" | "apply"): Promise<ImportResult> {
  const g = await guardPermission("integrations.manage");
  if (!g.ok) return { ok: false, errors: [g.error] };
  if (json.length > MAX_IMPORT_BYTES) return { ok: false, errors: ["The file is larger than 5 MB."] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON."] };
  }
  const result = validateBundle(parsed);
  if (!result.ok) return { ok: false, errors: result.errors };
  if (mode === "check") return { ok: true, applied: false, summary: result.summary };

  const report = await applyBundle(result.bundle, g.admin);
  await writeAudit(g.admin, "content.import", "Content", null, null, { summary: result.summary, created: report.created, updated: report.updated, skipped: report.skipped.length });
  revalidatePath("/admin/website", "layout");
  void revalidateSite(["", "services", "pricing", "blog", "about", "contact"].filter(Boolean));
  return { ok: true, applied: true, report };
}
