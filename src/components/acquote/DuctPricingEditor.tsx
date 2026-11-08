"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { addDuctCalculatorToPage, saveDuctPricing } from "@/app/admin/self-quotes/actions";
import { MODES, MODE_LABEL, SPEC_KEYS, UNITS, type Bi, type BiList, type DuctConfig, type Unit } from "@/lib/ductwork/config";

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

const SPEC_NAME: Record<(typeof SPEC_KEYS)[number], string> = { gauge: "Duct gauge / thickness", fiberglass: "Fiberglass insulation thickness", pir: "PIR panel thickness", pressure: "Duct pressure class", application: "Duct application" };

function ListEditor({ label, value, onChange }: { label: string; value: BiList; onChange: (v: BiList) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div><label className={lab}>{label} (English, one per line)</label><textarea className={input} rows={4} defaultValue={value.en.join("\n")} onBlur={(e) => onChange({ ...value, en: toLines(e.target.value) })} /></div>
      <div><label className={lab}>{label} (العربية، سطر لكل بند)</label><textarea className={input} dir="rtl" rows={4} defaultValue={value.ar.join("\n")} onBlur={(e) => onChange({ ...value, ar: toLines(e.target.value) })} /></div>
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
function OptionList({ title, value, onChange, keyLocked }: { title: string; value: Option[]; onChange: (v: Option[]) => void; keyLocked?: boolean }) {
  const set = (i: number, patch: Partial<Option>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <div>
      <label className={lab}>{title}</label>
      {value.map((o, i) => (
        <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
          <input className={input} value={o.key} placeholder="key" disabled={keyLocked} onChange={(e) => set(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) })} />
          <input className={input} value={o.en} placeholder="English" onChange={(e) => set(i, { en: e.target.value })} />
          <input className={input} dir="rtl" value={o.ar} placeholder="العربية" onChange={(e) => set(i, { ar: e.target.value })} />
          <button type="button" className={btn} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className={btn} onClick={() => onChange([...value, { key: `option-${value.length + 1}`, en: "", ar: "" }])}>+ Add</button>
    </div>
  );
}

export function DuctPricingEditor({ initial, page }: { initial: DuctConfig; page: { id: string; status: string; hasBlock: boolean } | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [c, setC] = useState<DuctConfig>(initial);
  const set = (patch: Partial<DuctConfig>) => setC({ ...c, ...patch });
  const save = () => start(async () => { const r = await saveDuctPricing(c); if (!r.ok) return showToast(r.error ?? "Could not save.", "error"); showToast("Saved. It is live on the website."); router.refresh(); });
  const addBlock = () => start(async () => { const r = await addDuctCalculatorToPage(); if (!r.ok) return showToast(r.error ?? "Could not add the calculator.", "error"); showToast("The calculator was added to the draft of the page."); router.refresh(); });
  const setSystem = (i: number, patch: Partial<DuctConfig["systems"][number]>) => set({ systems: c.systems.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setAcc = (i: number, patch: Partial<DuctConfig["accessories"][number]>) => set({ accessories: c.accessories.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setSvc = (i: number, patch: Partial<DuctConfig["services"][number]>) => set({ services: c.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <div className={`${card} border-blue-200 bg-blue-50/40`}>
        <h3 className={h3}>The page /duct-insulation</h3>
        {!page ? <p className="text-sm text-slate-700">The page <code>/duct-insulation</code> does not exist in the page builder yet. Create it under Website → Pages (the calculator is added to the existing page; its design is not changed).</p> : (
          <div className="text-sm text-slate-700">
            <p>The page exists ({page.status.toLowerCase()}). {page.hasBlock ? "The calculator block is already in its draft." : "The calculator is not in its draft yet."} <Link href={`/admin/website/pages/${page.id}`} className="font-semibold text-blue-700 hover:underline">Open it in the page builder</Link> to move the block, review and publish.</p>
            {!page.hasBlock && <button type="button" className={`${primary} mt-2`} disabled={pending} onClick={addBlock}>Add the calculator to the page draft</button>}
            <p className="mt-2 text-xs text-slate-500">Only the draft is changed, after the content that is already there. Nothing goes live until you publish the page.</p>
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className={h3}>General</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={lab}>VAT %</label><input className={input} type="number" min={0} max={100} step="0.1" value={c.vatPercent} onChange={(e) => set({ vatPercent: num(e.target.value) })} /></div>
          <div><label className={lab}>Quotation valid for (days)</label><input className={input} type="number" min={1} max={365} value={c.validityDays} onChange={(e) => set({ validityDays: Math.floor(num(e.target.value)) })} /></div>
          <div><label className={lab}>Minimum total area (m², 0 = none)</label><input className={input} type="number" min={0} step="0.1" value={c.minAreaM2} onChange={(e) => set({ minAreaM2: num(e.target.value) })} /></div>
          <div />
          <div><label className={lab}>Max files per quotation</label><input className={input} type="number" min={0} max={20} value={c.uploads.maxFiles} onChange={(e) => set({ uploads: { ...c.uploads, maxFiles: Math.floor(num(e.target.value)) } })} /></div>
          <div><label className={lab}>Max size per file (MB)</label><input className={input} type="number" min={1} max={25} value={c.uploads.maxMb} onChange={(e) => set({ uploads: { ...c.uploads, maxMb: num(e.target.value) } })} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Prices are entered and shown <b>without</b> VAT; VAT is added once on the subtotal, after any discount.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.discount.enabled} onChange={(e) => set({ discount: { ...c.discount, enabled: e.target.checked } })} />Discount line</label>
          <div><label className={lab}>Type</label><select className={input} value={c.discount.type} onChange={(e) => set({ discount: { ...c.discount, type: e.target.value as "percent" | "fixed" } })}><option value="percent">Percent of the subtotal</option><option value="fixed">Fixed amount (AED)</option></select></div>
          <div><label className={lab}>Value</label><input className={input} type="number" min={0} step="0.01" value={c.discount.value} onChange={(e) => set({ discount: { ...c.discount, value: num(e.target.value) } })} /></div>
          <div className="grid grid-cols-2 gap-1"><div><label className={lab}>Label EN</label><input className={input} value={c.discount.labelEn} onChange={(e) => set({ discount: { ...c.discount, labelEn: e.target.value } })} /></div><div><label className={lab}>Label AR</label><input className={input} dir="rtl" value={c.discount.labelAr} onChange={(e) => set({ discount: { ...c.discount, labelAr: e.target.value } })} /></div></div>
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Duct systems and rates (AED per m², without VAT)</h3>
        <p className="mb-3 text-xs text-slate-500">For every system, choose which kinds of work are offered and the rate for each. A work mode with <b>no rate</b> is offered as a &ldquo;request for quotation&rdquo;: it is not added to the totals. Nothing is assumed: only what you switch on appears for the customer.</p>
        {c.systems.map((s, i) => (
          <div key={s.key} className="mb-4 rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm text-slate-900">{s.nameEn || s.key} <code className="ms-1 text-xs font-normal text-slate-400">{s.key}</code></b>
              <div className="flex items-center gap-3"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={s.active} onChange={(e) => setSystem(i, { active: e.target.checked })} />Shown on the website</label>
                <button type="button" className={btn} disabled={c.systems.length <= 1} onClick={() => { if (window.confirm("Remove this system? Quotations already created keep it.")) set({ systems: c.systems.filter((_, j) => j !== i) }); }}>Remove</button></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label className={lab}>Name (English)</label><input className={input} value={s.nameEn} onChange={(e) => setSystem(i, { nameEn: e.target.value })} /></div>
              <div><label className={lab}>الاسم (العربية)</label><input className={input} dir="rtl" value={s.nameAr} onChange={(e) => setSystem(i, { nameAr: e.target.value })} /></div>
              <div><label className={lab}>Short name EN</label><input className={input} value={s.shortEn} onChange={(e) => setSystem(i, { shortEn: e.target.value })} /></div>
              <div><label className={lab}>الاسم المختصر</label><input className={input} dir="rtl" value={s.shortAr} onChange={(e) => setSystem(i, { shortAr: e.target.value })} /></div>
              <div><label className={lab}>Description (English)</label><textarea className={input} rows={2} value={s.descriptionEn} onChange={(e) => setSystem(i, { descriptionEn: e.target.value })} /></div>
              <div><label className={lab}>الوصف (العربية)</label><textarea className={input} dir="rtl" rows={2} value={s.descriptionAr} onChange={(e) => setSystem(i, { descriptionAr: e.target.value })} /></div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Work mode</th><th className="py-1">Offered</th><th className="py-1">Rate (AED / m²) — empty = request for quotation</th></tr></thead>
                <tbody>
                  {MODES.map((m) => (
                    <tr key={m} className="border-t border-slate-100">
                      <td className="py-1.5 pe-2">{MODE_LABEL[m].en}<div className="text-[11px] text-slate-400" dir="rtl">{MODE_LABEL[m].ar}</div></td>
                      <td className="py-1.5"><input type="checkbox" checked={s.modes[m].enabled} onChange={(e) => setSystem(i, { modes: { ...s.modes, [m]: { ...s.modes[m], enabled: e.target.checked } } })} /></td>
                      <td className="py-1.5"><input className={`${input} w-40`} type="number" min={0} step="0.01" disabled={!s.modes[m].enabled} placeholder="request for quotation" value={s.modes[m].rate ?? ""} onChange={(e) => setSystem(i, { modes: { ...s.modes, [m]: { ...s.modes[m], rate: price(e.target.value) } } })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <label className={lab}>Technical specifications this system depends on (asked in step 8; unconfirmed ones are marked &ldquo;subject to technical review&rdquo;)</label>
              <div className="flex flex-wrap gap-3 text-sm">{SPEC_KEYS.map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={s.specFields.includes(k)} onChange={(e) => setSystem(i, { specFields: e.target.checked ? [...s.specFields, k] : s.specFields.filter((x) => x !== k) })} />{SPEC_NAME[k]}</label>)}</div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <ListEditor label="Included" value={s.included} onChange={(v) => setSystem(i, { included: v })} />
              <ListEditor label="Not included" value={s.notIncluded} onChange={(v) => setSystem(i, { notIncluded: v })} />
              <ListEditor label="Technical notes" value={s.technical} onChange={(v) => setSystem(i, { technical: v })} />
            </div>
          </div>
        ))}
        <button type="button" className={btn} onClick={() => {
          const base = `system-${c.systems.length + 1}`;
          const none = { enabled: false, rate: null as number | null };
          set({ systems: [...c.systems, { key: slug(base), nameEn: "New system", nameAr: "نظام جديد", shortEn: "New", shortAr: "جديد", descriptionEn: "", descriptionAr: "", included: { en: [], ar: [] }, notIncluded: { en: [], ar: [] }, technical: { en: [], ar: [] }, specFields: [], modes: { "supply-fabricate-install": { enabled: true, rate: null }, "fabricate-supply": none, "install-only": none, custom: { enabled: true, rate: null } }, active: false }] });
        }}>+ Add a duct system</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Accessories and components</h3>
        <p className="mb-2 text-xs text-slate-500">Each one can be sold by one or more units (PCS, LM, m², SET, LOT) with its own price. A unit with <b>no price</b> is offered as a &ldquo;request for quotation&rdquo; and is not added to the totals.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Name (EN)</th><th className="py-1">الاسم (AR)</th><th className="py-1">Units and prices (AED, without VAT)</th><th className="py-1">Shown</th><th /></tr></thead>
            <tbody>
              {c.accessories.map((a, i) => (
                <tr key={a.key} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pe-1"><input className={input} value={a.nameEn} onChange={(e) => setAcc(i, { nameEn: e.target.value })} /></td>
                  <td className="py-1.5 pe-1"><input className={input} dir="rtl" value={a.nameAr} onChange={(e) => setAcc(i, { nameAr: e.target.value })} /></td>
                  <td className="py-1.5 pe-1">
                    <div className="flex flex-wrap gap-2">
                      {UNITS.map((u: Unit) => {
                        const on = a.units.includes(u);
                        return (
                          <div key={u} className={`rounded-lg border p-1.5 ${on ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
                            <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={on} onChange={(e) => setAcc(i, { units: e.target.checked ? [...a.units, u] : a.units.filter((x) => x !== u), prices: e.target.checked ? { ...a.prices, [u]: a.prices[u] ?? null } : a.prices })} />{u === "m2" ? "m²" : u}</label>
                            {on && <input className={`${input} mt-1 w-24`} type="number" min={0} step="0.01" placeholder="RFQ" value={a.prices[u] ?? ""} onChange={(e) => setAcc(i, { prices: { ...a.prices, [u]: price(e.target.value) } })} />}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-1.5"><input type="checkbox" checked={a.active} onChange={(e) => setAcc(i, { active: e.target.checked })} /></td>
                  <td className="py-1.5"><button type="button" className={btn} onClick={() => set({ accessories: c.accessories.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ accessories: [...c.accessories, { key: `item-${Date.now().toString(36)}`, nameEn: "", nameAr: "", units: ["PCS"], prices: { PCS: null }, active: true }] })}>+ Add a component</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Additional services</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Name (EN)</th><th className="py-1">الاسم (AR)</th><th className="py-1">Unit</th><th className="py-1">Price (AED) — empty = RFQ</th><th className="py-1">Shown</th><th /></tr></thead>
            <tbody>
              {c.services.map((s, i) => (
                <tr key={s.key} className="border-t border-slate-100">
                  <td className="py-1.5 pe-1"><input className={input} value={s.nameEn} onChange={(e) => setSvc(i, { nameEn: e.target.value })} /></td>
                  <td className="py-1.5 pe-1"><input className={input} dir="rtl" value={s.nameAr} onChange={(e) => setSvc(i, { nameAr: e.target.value })} /></td>
                  <td className="py-1.5 pe-1"><select className={`${input} w-24`} value={s.unit} onChange={(e) => setSvc(i, { unit: e.target.value as Unit })}>{UNITS.map((u) => <option key={u} value={u}>{u === "m2" ? "m²" : u}</option>)}</select></td>
                  <td className="py-1.5 pe-1"><input className={`${input} w-36`} type="number" min={0} step="0.01" placeholder="request for quotation" value={s.price ?? ""} onChange={(e) => { const p = price(e.target.value); setSvc(i, { price: p, rfq: p == null }); }} /></td>
                  <td className="py-1.5"><input type="checkbox" checked={s.active} onChange={(e) => setSvc(i, { active: e.target.checked })} /></td>
                  <td className="py-1.5"><button type="button" className={btn} onClick={() => set({ services: c.services.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btn} mt-2`} onClick={() => set({ services: [...c.services, { key: `service-${Date.now().toString(36)}`, nameEn: "", nameAr: "", unit: "LOT", price: null, rfq: true, active: true }] })}>+ Add a service</button>
      </div>

      <div className={card}>
        <h3 className={h3}>Technical option lists (step 8)</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {SPEC_KEYS.map((k) => <OptionList key={k} title={SPEC_NAME[k]} value={c.specs[k]} onChange={(v) => set({ specs: { ...c.specs, [k]: v } })} />)}
        </div>
        <p className="mt-2 text-xs text-slate-500">Nothing is pre-selected for the customer. &ldquo;Not sure&rdquo; is always offered and is printed as &ldquo;subject to technical review&rdquo;.</p>
      </div>

      <div className={card}>
        <h3 className={h3}>Texts on the quotation</h3>
        <div className="flex flex-col gap-3">
          <BiArea label="Estimate notice (shown in the summary and on the PDF)" value={c.estimateNotice} onChange={(v) => set({ estimateNotice: v })} />
          <BiArea label="Straight duct note" value={c.straightDuctNote} onChange={(v) => set({ straightDuctNote: v })} rows={3} />
          <BiArea label="Note for specifications the customer did not confirm" value={c.reviewNote} onChange={(v) => set({ reviewNote: v })} />
          <ListEditor label="Terms and notes" value={c.terms} onChange={(v) => set({ terms: v })} />
        </div>
      </div>

      <div className={card}>
        <h3 className={h3}>Project types and emirates</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <OptionList title="Project types" value={c.projectTypes} onChange={(v) => set({ projectTypes: v })} />
          <div>
            <label className={lab}>Emirates (key is stored with the quotation)</label>
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
