import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { FieldForm } from "../LegalClient";

export default async function LegalFieldsPage() {
  await requireEmployee("ADMIN");
  const fields = await prisma.legalField.findMany({ orderBy: [{ confirmed: "asc" }, { key: "asc" }] });
  const open = fields.filter((f) => !f.confirmed);
  return (
    <div className="pb-10">
      <AdminTopBar title="Legal Center" />
      <div className="space-y-5 px-6 py-6">
        <Link href="/admin/legal" className="text-sm font-medium text-blue-600">← Legal Center</Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Decisions to confirm</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Numbers and details the policies refer to (cancellation window, refund time, payment period…). Fill each one in English and Arabic and confirm it. A document that uses an unconfirmed decision cannot be published, so nothing unapproved ever reaches customers.</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{open.length} still to confirm, {fields.length - open.length} confirmed.</p>
        </div>
        {fields.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Nothing here yet. Load the starter documents first, from the Legal Center page.</p>}
        <div className="space-y-3">
          {fields.map((f) => <FieldForm key={f.id + f.updatedAt.toISOString()} field={{ key: f.key, labelEn: f.labelEn, labelAr: f.labelAr, hintEn: f.hintEn, valueEn: f.valueEn, valueAr: f.valueAr, confirmed: f.confirmed }} />)}
        </div>
      </div>
    </div>
  );
}
