"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { saveContractSettings } from "@/app/admin/contracts/actions";

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";
const lab = "mb-1 block text-xs font-medium text-slate-600";

export function ContractSettingsForm({ initial }: { initial: { paymentInstructionsEn: string; paymentInstructionsAr: string; renewalWindowDays: number } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState(initial);
  return (
    <div className="grid max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div><label className={lab}>How to pay (English), for example the bank account details or &ldquo;contact us to pay by card&rdquo;</label><textarea className={input} rows={5} value={f.paymentInstructionsEn} onChange={(e) => setF({ ...f, paymentInstructionsEn: e.target.value })} /></div>
      <div><label className={lab}>طريقة الدفع (عربي)</label><textarea className={input} dir="rtl" rows={5} value={f.paymentInstructionsAr} onChange={(e) => setF({ ...f, paymentInstructionsAr: e.target.value })} /></div>
      <div className="max-w-xs"><label className={lab}>Highlight &ldquo;Renewal due&rdquo; this many days before an agreement expires</label><input type="number" min={0} max={365} className={input} value={f.renewalWindowDays} onChange={(e) => setF({ ...f, renewalWindowDays: Number(e.target.value) })} /></div>
      <div><button type="button" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40" onClick={() => start(async () => { const r = await saveContractSettings(f); if (!r.ok) return showToast(r.error ?? "Could not save.", "error"); showToast("Saved."); router.refresh(); })}>Save</button></div>
    </div>
  );
}
