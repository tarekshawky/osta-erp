"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { createDuctedPage, savePricing } from "@/app/admin/self-quotes/actions";
import type { AcConfig, BiList } from "@/lib/acquote/config";

const card = "rounded-xl border border-slate-200 bg-white p-4";
const h3 = "mb-2 text-sm font-semibold text-slate-900";
const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";
const lab = "mb-1 block text-xs font-medium text-slate-600";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40";

const toLines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

// A list of short items edited as one line each, in both languages.
function ListEditor({ label, value, onChange }: { label: string; value: BiList; onChange: (v: BiList) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div><label className={lab}>{label} (English, one per line)</label><textarea className={input} rows={5} value={value.en.join("\n")} onChange={(e) => onChange({ ...value, en: toLines(e.target.value) })} onBlur={() => undefined} /></div>
      <div><label className={lab}>{label} (العربية، سطر لكل بند)</label><textarea className={input} dir="rtl" rows={5} value={value.ar.join("\n")} onChange={(e) => onChange({ ...value, ar: toLines(e.target.value) })} /></div>
    </div>
  );
}

export function PricingEditor({ initial, page }: { initial: AcConfig; page: { id: string; status: string } | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [c, setC] = useState<AcConfig>(initial);
  const set = (patch: Partial<AcConfig>) => setC({ ...c, ...patch });
  const save = () => start(async () => { const r = await savePricing(c); if (!r.ok) return showToast(r.error ?? "Could not save.", "error"); showToast("Pricing saved. It is live on the website."); router.refresh(); });
  const makePage = () => start(async () => { const r = await createDuctedPage(); if (!r.ok) return showToast(r.error ?? "Could not create the page.", "error"); showToast("The page was created as a draft."); router.refresh(); });

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <div className={`${card} border-blue-200 bg-blue-50/40`}>
        <h3 className={h3}>The page /ducted-ac-installation</h3>
        {page ? <p className="text-sm text-slate-700">The page exists ({page.status.toLowerCase()}). <Link href={`/admin/website/pages/${page.id}`} className="font-semibold text-blue-700 hover:underline">Open it in the page builder</Link> to review, edit and publish. Everything below appears in its calculator block.</p> : (
          <div><p className="mb-2 text-sm text-slate-700">The page does not exist yet. Create it as a <b>draft</b> with all the content, the calculator and the SEO fields; nothing goes live until you review and publish it.</p><button type="button" className={primary} disabled={pending} onClick={makePage}>Create the page (draft)</button></div>
        )}
      </div>

      <div className={card}>
        <h3 className={h3}>General</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={lab}>VAT %</label><input className={input} type="number" min={0} max={100} step="0.1" value={c.vatPercent} onChange={(e) => set({ vatPercent: num(e.target.value) })} /></div>
          <div><label className={lab}>Quotation valid for (days)</label><input className={input} type="number" min={1} max={365} value={c.validityDays} onChange={(e) => set({ validityDays: Math.floor(num(e.target.value)) })} /></div>
          <div><label className={lab}>Max files per quotation</label><input className={input} type="number" min={0} max={20} value={c.uploads.maxFiles} onChange={(e) => set({ uploads: { ...c.uploads, maxFiles: Math.floor(num(e.target.value)) } })} /></div>
          <div><label className={lab}>Max size per file (MB)</label><input className={input} type="number" min={1} max={25} value={c.uploads.maxMb} onChange={(e) => set({ uploads: { ...c.uploads, maxMb: num(e.target.value) } })} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Prices are entered and shown <b>without</b> VAT; VAT is added once on the subtotal.</p>
      </div>

      <div className={card}>
        <h3 className={h3}>Installation prices by capacity (AED per unit, without VAT)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-1 py-1">Key</th><th className="px-1 py-1">Label (EN)</th><th className="px-1 py-1">الاسم (AR)</th><th className="px-1 py-1">Standard</th><th className="px-1 py-1">Complete</th><th className="px-1 py-1">Premium</th><th className="px-1 py-1">Active</th><th /></tr></thead>
            <tbody>
              {c.capacities.map((x, i) => {
                const up = (patch: Partial<typeof x>) => set({ capacities: c.capacities.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
                return (
                  <tr key={i}>
                    <td className="px-1 py-1"><input className={`${input} w-20`} value={x.key} onChange={(e) => up({ key: e.target.value })} /></td>
                    <td className="px-1 py-1"><input className={input} value={x.labelEn} onChange={(e) => up({ labelEn: e.target.value })} /></td>
                    <td className="px-1 py-1"><input className={input} dir="rtl" value={x.labelAr} onChange={(e) => up({ labelAr: e.target.value })} /></td>
                    {(["standard", "complete", "premium"] as const).map((k) => <td key={k} className="px-1 py-1"><input className={`${input} w-24`} type="number" min={0} value={x.prices[k]} onChange={(e) => up({ prices: { ...x.prices, [k]: num(e.target.value) } })} /></td>)}
                    <td className="px-1 py-1"><input type="checkbox" checked={x.active} onChange={(e) => up({ active: e.target.checked })} /></td>
                    <td className="px-1 py-1"><button type="button" className={btn} disabled={c.capacities.length <= 1} onClick={() => set({ capacities: c.capacities.filter((_, j) => j !== i) })}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ capacities: [...c.capacities, { key: "", labelEn: "", labelAr: "", active: true, prices: { standard: 0, complete: 0, premium: 0 } }] })}>+ Add a capacity</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Mandatory plenum modification (added to EVERY unit)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={lab}>Price per unit (AED)</label><input className={input} type="number" min={0} value={c.plenum.price} onChange={(e) => set({ plenum: { ...c.plenum, price: num(e.target.value) } })} /></div>
          <div><label className={lab}>Name (EN)</label><input className={input} value={c.plenum.nameEn} onChange={(e) => set({ plenum: { ...c.plenum, nameEn: e.target.value } })} /></div>
          <div><label className={lab}>الاسم (AR)</label><input className={input} dir="rtl" value={c.plenum.nameAr} onChange={(e) => set({ plenum: { ...c.plenum, nameAr: e.target.value } })} /></div>
          <div className="sm:col-span-3 grid gap-2 sm:grid-cols-2"><div><label className={lab}>Explanation (EN)</label><textarea className={input} rows={2} value={c.plenum.descriptionEn} onChange={(e) => set({ plenum: { ...c.plenum, descriptionEn: e.target.value } })} /></div><div><label className={lab}>الشرح (AR)</label><textarea className={input} dir="rtl" rows={2} value={c.plenum.descriptionAr} onChange={(e) => set({ plenum: { ...c.plenum, descriptionAr: e.target.value } })} /></div></div>
        </div>
        <div className="mt-3"><ListEditor label="Includes" value={c.plenum.included} onChange={(v) => set({ plenum: { ...c.plenum, included: v } })} /></div>
        <div className="mt-3"><ListEditor label="Does not include" value={c.plenum.notIncluded} onChange={(v) => set({ plenum: { ...c.plenum, notIncluded: v } })} /></div>
      </div>

      {c.packages.map((k, i) => {
        const up = (patch: Partial<typeof k>) => set({ packages: c.packages.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
        return (
          <div key={k.key} className={card}>
            <h3 className={h3}>Package: {k.key}</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div><label className={lab}>Name (EN)</label><input className={input} value={k.nameEn} onChange={(e) => up({ nameEn: e.target.value })} /></div>
              <div><label className={lab}>الاسم (AR)</label><input className={input} dir="rtl" value={k.nameAr} onChange={(e) => up({ nameAr: e.target.value })} /></div>
              <div><label className={lab}>Copper pipe metres included</label><input className={input} type="number" min={0} value={k.copperMeters} onChange={(e) => up({ copperMeters: num(e.target.value) })} /></div>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700"><input type="checkbox" checked={k.active} onChange={(e) => up({ active: e.target.checked })} />Show this package</label>
              <div className="sm:col-span-2"><label className={lab}>Subtitle (EN)</label><input className={input} value={k.subtitleEn} onChange={(e) => up({ subtitleEn: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className={lab}>العنوان الفرعي (AR)</label><input className={input} dir="rtl" value={k.subtitleAr} onChange={(e) => up({ subtitleAr: e.target.value })} /></div>
            </div>
            <div className="mt-3"><ListEditor label="Included" value={k.included} onChange={(v) => up({ included: v })} /></div>
            <div className="mt-3"><ListEditor label="Not included" value={k.notIncluded} onChange={(v) => up({ notIncluded: v })} /></div>
          </div>
        );
      })}

      <div className={card}>
        <h3 className={h3}>Optional services</h3>
        <p className="mb-2 text-xs text-slate-500">Leave the price empty, or tick &ldquo;Quotation&rdquo;, for work that needs measurements or a visit (new ducts, cranes…): the customer then sees &ldquo;request for quotation&rdquo; and no price is invented.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-1 py-1">Name (EN)</th><th className="px-1 py-1">الاسم (AR)</th><th className="px-1 py-1">Unit</th><th className="px-1 py-1">Price (AED)</th><th className="px-1 py-1">Quotation</th><th className="px-1 py-1">Active</th><th /></tr></thead>
            <tbody>
              {c.services.map((x, i) => {
                const up = (patch: Partial<typeof x>) => set({ services: c.services.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
                return (
                  <tr key={x.key + i}>
                    <td className="px-1 py-1"><input className={input} value={x.nameEn} onChange={(e) => up({ nameEn: e.target.value })} /></td>
                    <td className="px-1 py-1"><input className={input} dir="rtl" value={x.nameAr} onChange={(e) => up({ nameAr: e.target.value })} /></td>
                    <td className="px-1 py-1"><select className={input} value={x.unit} onChange={(e) => up({ unit: e.target.value as typeof x.unit })}><option value="meter">per metre</option><option value="unit">per unit</option><option value="lot">per job</option></select></td>
                    <td className="px-1 py-1"><input className={`${input} w-28`} type="number" min={0} placeholder="quotation" value={x.price ?? ""} onChange={(e) => up({ price: e.target.value.trim() === "" ? null : num(e.target.value) })} /></td>
                    <td className="px-1 py-1"><input type="checkbox" checked={x.rfq} onChange={(e) => up({ rfq: e.target.checked })} /></td>
                    <td className="px-1 py-1"><input type="checkbox" checked={x.active} onChange={(e) => up({ active: e.target.checked })} /></td>
                    <td className="px-1 py-1"><button type="button" className={btn} onClick={() => set({ services: c.services.filter((_, j) => j !== i) })}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ services: [...c.services, { key: `service-${Date.now().toString(36)}`, nameEn: "", nameAr: "", unit: "unit", price: null, rfq: false, active: true }] })}>+ Add a service</button>
      </div>

      <div className={card}>
        <h3 className={h3}>AC types</h3>
        {c.acTypes.map((t, i) => {
          const up = (patch: Partial<typeof t>) => set({ acTypes: c.acTypes.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
          return (
            <div key={t.key} className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <div><label className={lab}>Name (EN)</label><input className={input} value={t.nameEn} onChange={(e) => up({ nameEn: e.target.value })} /></div>
              <div><label className={lab}>الاسم (AR)</label><input className={input} dir="rtl" value={t.nameAr} onChange={(e) => up({ nameAr: e.target.value })} /></div>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700"><input type="checkbox" checked={t.active} onChange={(e) => up({ active: e.target.checked })} />Active</label>
              <div><label className={lab}>Description (EN)</label><textarea className={input} rows={2} value={t.descriptionEn} onChange={(e) => up({ descriptionEn: e.target.value })} /></div>
              <div><label className={lab}>الوصف (AR)</label><textarea className={input} dir="rtl" rows={2} value={t.descriptionAr} onChange={(e) => up({ descriptionAr: e.target.value })} /></div>
            </div>
          );
        })}
      </div>

      <div className={card}>
        <h3 className={h3}>Not included in the prices, and the estimate notice</h3>
        <ListEditor label="Not included" value={c.exclusions} onChange={(v) => set({ exclusions: v })} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><label className={lab}>Notice shown with every quotation (EN)</label><textarea className={input} rows={3} value={c.disclaimer.en} onChange={(e) => set({ disclaimer: { ...c.disclaimer, en: e.target.value } })} /></div>
          <div><label className={lab}>الإشعار (AR)</label><textarea className={input} dir="rtl" rows={3} value={c.disclaimer.ar} onChange={(e) => set({ disclaimer: { ...c.disclaimer, ar: e.target.value } })} /></div>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <button type="button" className={primary} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save pricing"}</button>
        <span className="text-xs text-slate-500">New quotations use these prices at once. Existing quotations keep theirs.</span>
      </div>
    </div>
  );
}
