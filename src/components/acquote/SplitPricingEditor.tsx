"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { ImageUploadField } from "@/components/ImageUploadField";
import { addSplitToPage, saveSplitPricing } from "@/app/admin/self-quotes/actions";
import { EXTRA_UNITS, type Bi, type BiList, type SplitConfig } from "@/lib/splitquote/config";

const card = "rounded-xl border border-slate-200 bg-white p-4";
const h3 = "mb-2 text-sm font-semibold text-slate-900";
const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm";
const lab = "mb-1 block text-xs font-medium text-slate-600";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40";

const toLines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
// An empty price box means "request for quotation": null, never zero.
const price = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v) || 0));
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

function ListEditor({ label, value, onChange }: { label: string; value: BiList; onChange: (v: BiList) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div><label className={lab}>{label} (English, one per line)</label><textarea className={input} rows={5} defaultValue={value.en.join("\n")} onBlur={(e) => onChange({ ...value, en: toLines(e.target.value) })} /></div>
      <div><label className={lab}>{label} (العربية، سطر لكل بند)</label><textarea className={input} dir="rtl" rows={5} defaultValue={value.ar.join("\n")} onBlur={(e) => onChange({ ...value, ar: toLines(e.target.value) })} /></div>
    </div>
  );
}
function BiArea({ label, value, onChange, rows = 2 }: { label: string; value: Bi; onChange: (v: Bi) => void; rows?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div><label className={lab}>{label} (English)</label><textarea className={input} rows={rows} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} /></div>
      <div><label className={lab}>{label} (العربية)</label><textarea className={input} dir="rtl" rows={rows} value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} /></div>
    </div>
  );
}

type Option = { key: string; en: string; ar: string };
function OptionList({ title, value, onChange }: { title: string; value: Option[]; onChange: (v: Option[]) => void }) {
  const set = (i: number, patch: Partial<Option>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <div>
      <label className={lab}>{title}</label>
      {value.map((o, i) => (
        <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
          <input className={input} value={o.key} placeholder="key" onChange={(e) => set(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) })} />
          <input className={input} value={o.en} placeholder="English" onChange={(e) => set(i, { en: e.target.value })} />
          <input className={input} dir="rtl" value={o.ar} placeholder="العربية" onChange={(e) => set(i, { ar: e.target.value })} />
          <button type="button" className={btn} disabled={value.length <= 1} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className={btn} onClick={() => onChange([...value, { key: `option-${value.length + 1}`, en: "", ar: "" }])}>+ Add</button>
    </div>
  );
}

export function SplitPricingEditor({ initial, page }: { initial: SplitConfig; page: { id: string; status: string; hasCalculator: boolean; hasFaq: boolean } | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [c, setC] = useState<SplitConfig>(initial);
  const set = (patch: Partial<SplitConfig>) => setC({ ...c, ...patch });
  const save = () => start(async () => { const r = await saveSplitPricing(c); if (!r.ok) return showToast(r.error ?? "Could not save.", "error"); showToast("Saved. It is live on the website."); router.refresh(); });
  const upgrade = () => start(async () => {
    const r = await addSplitToPage();
    if (!r.ok) return showToast(r.error ?? "Could not update the page.", "error");
    showToast(r.added?.length ? `Added to the page draft: ${r.added.join(", ")}.` : "The page draft already has everything.");
    router.refresh();
  });
  const setPkg = (i: number, patch: Partial<SplitConfig["packages"][number]>) => set({ packages: c.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setCap = (i: number, patch: Partial<SplitConfig["capacities"][number]>) => set({ capacities: c.capacities.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setExtra = (i: number, patch: Partial<SplitConfig["extras"][number]>) => set({ extras: c.extras.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setPrice = (pi: number, capKey: string, v: string) => { const p = c.packages[pi]; const prices = { ...p.prices }; if (v.trim() === "") delete prices[capKey]; else prices[capKey] = Math.max(0, Number(v) || 0); setPkg(pi, { prices }); };

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <div className={`${card} border-blue-200 bg-blue-50/40`}>
        <h3 className={h3}>The page /split-ac-installation</h3>
        {!page ? <p className="text-sm text-slate-700">The page <code>/split-ac-installation</code> does not exist in the page builder yet. Create it under Website → Pages (the calculator is added to the existing page; its design is not changed).</p> : (
          <div className="text-sm text-slate-700">
            <p>The page exists ({page.status.toLowerCase()}). {page.hasCalculator ? "The calculator is in its draft." : "The calculator is not in its draft yet."} {page.hasFaq ? "It has a FAQ block." : "It has no FAQ block yet."} <Link href={`/admin/website/pages/${page.id}`} className="font-semibold text-blue-700 hover:underline">Open it in the page builder</Link> to move the blocks, edit the FAQ questions (English and Arabic), review and publish.</p>
            {(!page.hasCalculator || !page.hasFaq) && <button type="button" className={`${primary} mt-2`} disabled={pending} onClick={upgrade}>Add the calculator, the FAQ and the related links to the page draft</button>}
            <p className="mt-2 text-xs text-slate-500">Only the draft is changed, after the content that is already there; SEO fields that are still empty are filled and the ones you wrote are kept. Nothing goes live until you publish the page.</p>
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className={h3}>General</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={lab}>VAT %</label><input className={input} type="number" min={0} max={100} step="0.1" value={c.vatPercent} onChange={(e) => set({ vatPercent: num(e.target.value) })} /></div>
          <div><label className={lab}>Quotation valid for (days)</label><input className={input} type="number" min={1} max={365} value={c.validityDays} onChange={(e) => set({ validityDays: Math.floor(num(e.target.value)) })} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Prices are entered and shown <b>without</b> VAT; VAT is added once on the subtotal, after any discount.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.discount.enabled} onChange={(e) => set({ discount: { ...c.discount, enabled: e.target.checked } })} />Discount line</label>
          <div><label className={lab}>Type</label><select className={input} value={c.discount.type} onChange={(e) => set({ discount: { ...c.discount, type: e.target.value as "percent" | "fixed" } })}><option value="percent">Percent of the total</option><option value="fixed">Fixed amount (AED)</option></select></div>
          <div><label className={lab}>Value</label><input className={input} type="number" min={0} step="0.01" value={c.discount.value} onChange={(e) => set({ discount: { ...c.discount, value: num(e.target.value) } })} /></div>
          <div className="grid grid-cols-2 gap-1"><div><label className={lab}>Label EN</label><input className={input} value={c.discount.labelEn} onChange={(e) => set({ discount: { ...c.discount, labelEn: e.target.value } })} /></div><div><label className={lab}>Label AR</label><input className={input} dir="rtl" value={c.discount.labelAr} onChange={(e) => set({ discount: { ...c.discount, labelAr: e.target.value } })} /></div></div>
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Prices per AC unit (AED, without VAT)</h3>
        <p className="mb-2 text-xs text-slate-500">Every package needs a price for every capacity that is switched on.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="py-1">Capacity (EN)</th><th className="py-1">السعة (AR)</th><th className="py-1">Key</th><th className="py-1">On</th>{c.packages.map((p) => <th key={p.key} className="py-1">{p.nameEn || p.key}</th>)}<th /></tr>
            </thead>
            <tbody>
              {c.capacities.map((cap, ci) => (
                <tr key={ci} className="border-t border-slate-100">
                  <td className="py-1 pe-1"><input className={input} value={cap.labelEn} onChange={(e) => setCap(ci, { labelEn: e.target.value })} /></td>
                  <td className="py-1 pe-1"><input className={input} dir="rtl" value={cap.labelAr} onChange={(e) => setCap(ci, { labelAr: e.target.value })} /></td>
                  <td className="py-1 pe-1"><input className={`${input} w-20`} value={cap.key} onChange={(e) => setCap(ci, { key: e.target.value.replace(/[^0-9.]/g, "").slice(0, 5) })} /></td>
                  <td className="py-1"><input type="checkbox" checked={cap.active} onChange={(e) => setCap(ci, { active: e.target.checked })} /></td>
                  {c.packages.map((p, pi) => <td key={p.key} className="py-1 pe-1"><input className={`${input} w-24`} type="number" min={0} step="0.01" value={p.prices[cap.key] ?? ""} onChange={(e) => setPrice(pi, cap.key, e.target.value)} /></td>)}
                  <td className="py-1"><button type="button" className={btn} disabled={c.capacities.length <= 1} onClick={() => set({ capacities: c.capacities.filter((_, j) => j !== ci) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ capacities: [...c.capacities, { key: String(c.capacities.length + 1), labelEn: "", labelAr: "", active: true }] })}>+ Add a capacity</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Installation packages</h3>
        {c.packages.map((p, i) => (
          <div key={p.key} className="mb-4 rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm text-slate-900">{p.nameEn || p.key} <code className="ms-1 text-xs font-normal text-slate-400">{p.key}</code></b>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.active} onChange={(e) => setPkg(i, { active: e.target.checked })} />Shown on the website</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.highlighted} onChange={(e) => setPkg(i, { highlighted: e.target.checked })} />Highlight (recommended)</label>
                <button type="button" className={btn} disabled={c.packages.length <= 1} onClick={() => { if (window.confirm("Remove this package? Quotations already created keep it.")) set({ packages: c.packages.filter((_, j) => j !== i) }); }}>Remove</button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label className={lab}>Name (English)</label><input className={input} value={p.nameEn} onChange={(e) => setPkg(i, { nameEn: e.target.value })} /></div>
              <div><label className={lab}>الاسم (العربية)</label><input className={input} dir="rtl" value={p.nameAr} onChange={(e) => setPkg(i, { nameAr: e.target.value })} /></div>
              <div><label className={lab}>Short line (English)</label><input className={input} value={p.subtitleEn} onChange={(e) => setPkg(i, { subtitleEn: e.target.value })} /></div>
              <div><label className={lab}>سطر مختصر (العربية)</label><input className={input} dir="rtl" value={p.subtitleAr} onChange={(e) => setPkg(i, { subtitleAr: e.target.value })} /></div>
              <div><label className={lab}>Description (English)</label><textarea className={input} rows={2} value={p.descriptionEn} onChange={(e) => setPkg(i, { descriptionEn: e.target.value })} /></div>
              <div><label className={lab}>الوصف (العربية)</label><textarea className={input} dir="rtl" rows={2} value={p.descriptionAr} onChange={(e) => setPkg(i, { descriptionAr: e.target.value })} /></div>
              <div><label className={lab}>Copper pipe allowance (metres, 0 = none)</label><input className={input} type="number" min={0} step="0.5" value={p.copperMeters} onChange={(e) => setPkg(i, { copperMeters: num(e.target.value) })} /></div>
              <div><label className={lab}>Key (used in links and quotations; change only for a new package)</label><input className={input} value={p.key} onChange={(e) => setPkg(i, { key: slug(e.target.value) })} /></div>
              <div><label className={lab}>Icon name (for example Wrench, Package, BadgeCheck, ShieldCheck, Snowflake, Wind, Star)</label><input className={input} value={p.icon} onChange={(e) => setPkg(i, { icon: e.target.value.replace(/[^A-Za-z0-9]/g, "") })} /></div>
              <div className="grid grid-cols-2 gap-1"><div><label className={lab}>Image alt (EN)</label><input className={input} value={p.imageAltEn} onChange={(e) => setPkg(i, { imageAltEn: e.target.value })} /></div><div><label className={lab}>Image alt (AR)</label><input className={input} dir="rtl" value={p.imageAltAr} onChange={(e) => setPkg(i, { imageAltAr: e.target.value })} /></div></div>
            </div>
            <div className="mt-2 max-w-sm"><ImageUploadField label="Package image (optional)" value={p.imageUrl} onChange={(imageUrl) => setPkg(i, { imageUrl })} /></div>
            <div className="mt-3 flex flex-col gap-2">
              <ListEditor label="Included materials" value={p.materials} onChange={(v) => setPkg(i, { materials: v })} />
              <ListEditor label="Included services" value={p.services} onChange={(v) => setPkg(i, { services: v })} />
              <ListEditor label="Not included" value={p.notIncluded} onChange={(v) => setPkg(i, { notIncluded: v })} />
            </div>
          </div>
        ))}
        <button type="button" className={btn} onClick={() => {
          const key = slug(`package-${c.packages.length + 1}`);
          set({ packages: [...c.packages, { key, nameEn: "New package", nameAr: "باقة جديدة", subtitleEn: "", subtitleAr: "", descriptionEn: "", descriptionAr: "", copperMeters: 0, icon: "Package", imageUrl: "", imageAltEn: "", imageAltAr: "", highlighted: false, materials: { en: [], ar: [] }, services: { en: [], ar: [] }, notIncluded: { en: [], ar: [] }, prices: {}, active: false }] });
        }}>+ Add a package</button>
        <p className="mt-2 text-xs text-slate-500">A new package starts switched off; set its prices in the table above, then switch it on.</p>
      </div>

      <div className={card}>
        <h3 className={h3}>Additional services (extras)</h3>
        <p className="mb-2 text-xs text-slate-500">A price you leave empty is shown to the customer as &ldquo;Request for quotation&rdquo; and is not added to the totals.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Name (EN)</th><th className="py-1">الاسم (AR)</th><th className="py-1">Description (EN)</th><th className="py-1">الوصف (AR)</th><th className="py-1">Unit</th><th className="py-1">Price (AED)</th><th className="py-1">On</th><th /></tr></thead>
            <tbody>
              {c.extras.map((x, i) => (
                <tr key={x.key} className="border-t border-slate-100 align-top">
                  <td className="py-1 pe-1"><input className={input} value={x.nameEn} onChange={(e) => setExtra(i, { nameEn: e.target.value })} /></td>
                  <td className="py-1 pe-1"><input className={input} dir="rtl" value={x.nameAr} onChange={(e) => setExtra(i, { nameAr: e.target.value })} /></td>
                  <td className="py-1 pe-1"><input className={input} value={x.descriptionEn} onChange={(e) => setExtra(i, { descriptionEn: e.target.value })} /></td>
                  <td className="py-1 pe-1"><input className={input} dir="rtl" value={x.descriptionAr} onChange={(e) => setExtra(i, { descriptionAr: e.target.value })} /></td>
                  <td className="py-1 pe-1"><select className={`${input} w-28`} value={x.unit} onChange={(e) => setExtra(i, { unit: e.target.value as (typeof EXTRA_UNITS)[number] })}><option value="meter">per metre</option><option value="unit">per unit</option><option value="lot">per job</option></select></td>
                  <td className="py-1 pe-1"><input className={`${input} w-32`} type="number" min={0} step="0.01" placeholder="request for quotation" value={x.price ?? ""} onChange={(e) => { const p = price(e.target.value); setExtra(i, { price: p, rfq: p == null }); }} /></td>
                  <td className="py-1"><input type="checkbox" checked={x.active} onChange={(e) => setExtra(i, { active: e.target.checked })} /></td>
                  <td className="py-1"><button type="button" className={btn} onClick={() => set({ extras: c.extras.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ extras: [...c.extras, { key: `extra-${Date.now().toString(36)}`, nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", unit: "lot", price: null, rfq: true, active: true }] })}>+ Add a service</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Conditions and texts on the page and in the PDF</h3>
        <div className="flex flex-col gap-3">
          <ListEditor label="Package conditions" value={c.conditions} onChange={(v) => set({ conditions: v })} />
          <BiArea label="Important technical note" value={c.technicalNote} onChange={(v) => set({ technicalNote: v })} rows={3} />
          <BiArea label="Estimate notice" value={c.disclaimer} onChange={(v) => set({ disclaimer: v })} rows={3} />
          <BiArea label="Thank-you footer (first sentence is the title line)" value={c.footer} onChange={(v) => set({ footer: v })} rows={2} />
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Property types and emirates</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <OptionList title="Property types" value={c.propertyTypes} onChange={(v) => set({ propertyTypes: v })} />
          <div>
            <label className={lab}>Emirates (the key is stored with the quotation)</label>
            {c.emirates.map((e, i) => (
              <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
                <input className={input} value={e.key} onChange={(x) => set({ emirates: c.emirates.map((y, j) => (j === i ? { ...y, key: x.target.value } : y)) })} />
                <input className={input} value={e.en} onChange={(x) => set({ emirates: c.emirates.map((y, j) => (j === i ? { ...y, en: x.target.value } : y)) })} />
                <input className={input} dir="rtl" value={e.ar} onChange={(x) => set({ emirates: c.emirates.map((y, j) => (j === i ? { ...y, ar: x.target.value } : y)) })} />
                <button type="button" className={btn} disabled={c.emirates.length <= 1} onClick={() => set({ emirates: c.emirates.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className={btn} onClick={() => set({ emirates: [...c.emirates, { key: "", en: "", ar: "" }] })}>+ Add</button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur">
        <button type="button" className={primary} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save pricing"}</button>
        <span className="text-xs text-slate-500">A change is live on the website and in every NEW quotation straight away. Quotations already created keep the prices they were issued with.</span>
      </div>
    </div>
  );
}
