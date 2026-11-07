"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import {
  deletePackage, deleteService, duplicatePackage, loadStandardPackages, movePackage, moveService, savePackage, saveService, saveSettings, setPackageActive, updateSubscription,
  type PackageInput, type MResult,
} from "@/app/admin/website/maintenance-actions";
import { SUBSCRIPTION_STATUSES, buildComparison, formatPrice, type Pkg, type PkgService, type PkgSettings } from "@/lib/maintenance/packages";

type Request = { id: string; packageName: string; packagePrice: number; name: string; phone: string; email: string; emirate: string; location: string; propertyType: string; bedrooms: number; acUnits: number; activationDate: string | null; status: string; notes: string; createdAt: string };
type Tab = "packages" | "services" | "texts" | "requests";

const label = "text-xs font-medium text-slate-600";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";

function useRun() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<MResult>, ok?: string, after?: (r: MResult) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return showToast(r.error ?? "Something went wrong.", "error");
      if (ok) showToast(ok);
      after?.(r);
      router.refresh();
    });
  return { run, pending };
}

export function MaintenanceManager({ packages, active, services, settings, requests }: { packages: Pkg[]; active: Record<string, boolean>; services: PkgService[]; settings: PkgSettings; requests: Request[] }) {
  const [tab, setTab] = useState<Tab>("packages");
  const fresh = requests.filter((r) => r.status === "New").length;
  const tabs: { id: Tab; text: string }[] = [
    { id: "packages", text: `Packages (${packages.length})` }, { id: "services", text: `Services (${services.length})` }, { id: "texts", text: "Texts & terms" }, { id: "requests", text: `Requests${fresh ? ` · ${fresh} new` : ""}` },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Maintenance packages">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{t.text}</button>
        ))}
      </div>
      {tab === "packages" && <PackagesTab packages={packages} active={active} services={services} />}
      {tab === "services" && <ServicesTab services={services} />}
      {tab === "texts" && <TextsTab settings={settings} />}
      {tab === "requests" && <RequestsTab requests={requests} />}
    </div>
  );
}

// ---------------- Packages ----------------
type LineForm = { on: boolean; quantityEn: string; quantityAr: string; shortEn: string; shortAr: string };
type Form = Omit<PackageInput, "price" | "maxAcUnits" | "lines"> & { price: string; maxAcUnits: string; lines: Record<string, LineForm> };

const blankForm = (services: PkgService[]): Form => ({
  nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", suitableEn: "", suitableAr: "", price: "", maxAcUnits: "", badgeEn: "", badgeAr: "", highlighted: false, active: false,
  lines: Object.fromEntries(services.map((s) => [s.id, { on: false, quantityEn: "", quantityAr: "", shortEn: "", shortAr: "" }])),
});
const formOf = (p: Pkg, isActive: boolean, services: PkgService[]): Form => ({
  ...blankForm(services), nameEn: p.nameEn, nameAr: p.nameAr, descriptionEn: p.descriptionEn, descriptionAr: p.descriptionAr, suitableEn: p.suitableEn, suitableAr: p.suitableAr,
  price: String(p.price), maxAcUnits: p.maxAcUnits == null ? "" : String(p.maxAcUnits), badgeEn: p.badgeEn, badgeAr: p.badgeAr, highlighted: p.highlighted, active: isActive,
  lines: Object.fromEntries(services.map((s) => { const l = p.lines.find((x) => x.serviceId === s.id); return [s.id, { on: !!l, quantityEn: l?.quantityEn ?? "", quantityAr: l?.quantityAr ?? "", shortEn: l?.shortEn ?? "", shortAr: l?.shortAr ?? "" }]; })),
});

function PackagesTab({ packages, active, services }: { packages: Pkg[]; active: Record<string, boolean>; services: PkgService[] }) {
  const { run, pending } = useRun();
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const comparison = buildComparison(packages.filter((p) => active[p.id]), services);

  if (editing) return <PackageEditor key={editing.id ?? "new"} id={editing.id} initial={editing.form} services={services} onClose={() => setEditing(null)} />;

  if (packages.length === 0 && services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="mb-1 font-semibold text-slate-900">No packages yet</p>
        <p className="mb-4 text-sm text-slate-500">Load the four standard annual packages (Essential, Silver, Gold, Platinum) with their services, quantities and terms, then edit anything you like.</p>
        <button type="button" disabled={pending} onClick={() => run(loadStandardPackages, "The standard packages were loaded.")} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Load the standard packages</button>
        <p className="mt-3 text-xs text-slate-400">Or start from nothing: add your services under “Services”, then create a package here.</p>
        <button type="button" onClick={() => setEditing({ id: null, form: blankForm(services) })} className="mt-2 text-sm font-medium text-blue-600">+ New package</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing({ id: null, form: blankForm(services) })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ New package</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {packages.map((p, i) => (
          <div key={p.id} className={`flex flex-col gap-2 rounded-xl border bg-white p-4 ${active[p.id] ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active[p.id] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active[p.id] ? "Active" : "Off"}</span>
              {p.highlighted && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Recommended</span>}
              {p.badgeEn && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{p.badgeEn}</span>}
            </div>
            <p className="font-semibold text-slate-900">{p.nameEn}</p>
            <p className="text-lg font-bold text-blue-700">{formatPrice(p.price, "en")} <span className="text-xs font-normal text-slate-500">/ year</span></p>
            <p className="text-xs text-slate-500">{p.maxAcUnits != null ? `Up to ${p.maxAcUnits} AC units · ` : ""}{p.lines.length} services</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              <button type="button" className={btn} onClick={() => setEditing({ id: p.id, form: formOf(p, active[p.id], services) })}>Edit</button>
              <button type="button" className={btn} disabled={pending} onClick={() => run(() => duplicatePackage(p.id), "Duplicated (the copy is switched off).")}>Duplicate</button>
              <button type="button" className={btn} disabled={pending} onClick={() => run(() => setPackageActive(p.id, !active[p.id]), active[p.id] ? "Switched off." : "Switched on.")}>{active[p.id] ? "Deactivate" : "Activate"}</button>
              <button type="button" className={btn} disabled={pending || i === 0} aria-label="Move earlier" onClick={() => run(() => movePackage(p.id, -1))}>←</button>
              <button type="button" className={btn} disabled={pending || i === packages.length - 1} aria-label="Move later" onClick={() => run(() => movePackage(p.id, 1))}>→</button>
              <button type="button" className={`${btn} !text-red-600`} disabled={pending} onClick={() => { if (confirm(`Delete “${p.nameEn}”? Requests already made for it are kept.`)) run(() => deletePackage(p.id), "Deleted."); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {comparison.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Comparison table (built automatically from the active packages)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100 text-left text-slate-500"><th className="py-2 pr-3 font-medium">Feature</th>{packages.filter((p) => active[p.id]).map((p) => <th key={p.id} className="px-2 py-2 text-center font-medium">{p.nameEn.replace(" Package", "")}</th>)}</tr></thead>
              <tbody>{comparison.map((r) => (<tr key={r.key} className="border-b border-slate-50 last:border-0"><td className="py-1.5 pr-3 text-slate-700">{r.labelEn}</td>{r.cells.map((c, i) => <td key={i} className="px-2 py-1.5 text-center text-slate-600">{c.en}</td>)}</tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PackageEditor({ id, initial, services, onClose }: { id: string | null; initial: Form; services: PkgService[]; onClose: () => void }) {
  const { run, pending } = useRun();
  const [f, setF] = useState<Form>(initial);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setLine = (sid: string, patch: Partial<LineForm>) => setF((x) => ({ ...x, lines: { ...x.lines, [sid]: { ...x.lines[sid], ...patch } } }));

  function save() {
    const input: PackageInput = {
      ...f, price: Number(f.price), maxAcUnits: f.maxAcUnits.trim() === "" ? null : Number(f.maxAcUnits),
      lines: services.filter((s) => f.lines[s.id]?.on).map((s) => ({ serviceId: s.id, quantityEn: f.lines[s.id].quantityEn, quantityAr: f.lines[s.id].quantityAr, shortEn: f.lines[s.id].shortEn, shortAr: f.lines[s.id].shortAr })),
    };
    run(() => savePackage(id, input), "Saved.", onClose);
  }
  const text = (k: keyof Form, text: string, dir?: "rtl") => (
    <label className="flex flex-col gap-1.5"><span className={label}>{text}</span><input className={inputClassName} dir={dir} value={String(f[k])} onChange={(e) => set(k, e.target.value as never)} /></label>
  );
  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} className="text-sm text-slate-500">← Packages</button>
        <h3 className="font-semibold text-slate-900">{id ? "Edit package" : "New package"}</h3>
        <button type="button" onClick={save} disabled={pending} className="ml-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        {text("nameEn", "Name (English) *")}{text("nameAr", "الاسم (Arabic) *", "rtl")}
        {text("price", "Yearly price in AED *")}{text("maxAcUnits", "Maximum AC units (empty = no limit)")}
        {text("suitableEn", "Suitable for (English)")}{text("suitableAr", "مناسبة لـ (Arabic)", "rtl")}
        {text("descriptionEn", "Short description (English, optional)")}{text("descriptionAr", "وصف قصير (Arabic, optional)", "rtl")}
        {text("badgeEn", "Badge (English, for example Most Recommended)")}{text("badgeAr", "الشارة (Arabic)", "rtl")}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.highlighted} onChange={(e) => set("highlighted", e.target.checked)} />Recommended (highlighted; only one package at a time)</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />Active (shown on the website)</label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-900">Included services</p>
        <p className="mb-3 text-xs text-slate-500">Tick what the package includes and type the quantity, for example “2 visits/year” and “زيارتان في السنة”. The table value is optional (for example “2”, or “5 Vents”); if you leave it empty it is worked out from the quantity. A service you have not ticked shows “—” in the table.</p>
        {services.length === 0 && <p className="text-sm text-slate-400">Add services first, under the Services tab.</p>}
        <div className="flex flex-col gap-2">
          {services.map((s) => {
            const l = f.lines[s.id];
            return (
              <div key={s.id} className={`rounded-lg border p-3 ${l.on ? "border-blue-200 bg-blue-50/40" : "border-slate-100"}`}>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800"><input type="checkbox" checked={l.on} onChange={(e) => setLine(s.id, { on: e.target.checked })} />{s.nameEn} <span className="text-slate-400" dir="rtl">{s.nameAr}</span></label>
                {l.on && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input className={inputClassName} placeholder="Quantity (English)" value={l.quantityEn} onChange={(e) => setLine(s.id, { quantityEn: e.target.value })} aria-label={`${s.nameEn} quantity in English`} />
                    <input className={inputClassName} dir="rtl" placeholder="الكمية (Arabic)" value={l.quantityAr} onChange={(e) => setLine(s.id, { quantityAr: e.target.value })} aria-label={`${s.nameEn} quantity in Arabic`} />
                    <input className={inputClassName} placeholder="Table value (EN)" value={l.shortEn} onChange={(e) => setLine(s.id, { shortEn: e.target.value })} aria-label={`${s.nameEn} table value in English`} />
                    <input className={inputClassName} dir="rtl" placeholder="قيمة الجدول (AR)" value={l.shortAr} onChange={(e) => setLine(s.id, { shortAr: e.target.value })} aria-label={`${s.nameEn} table value in Arabic`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- Services ----------------
function ServicesTab({ services }: { services: PkgService[] }) {
  const { run, pending } = useRun();
  const [draft, setDraft] = useState<{ id: string | null; nameEn: string; nameAr: string; showInComparison: boolean } | null>(null);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <p className="text-sm text-slate-500">The services a package can include. Each one is a row in the comparison table. Pest control cannot be added.</p>
      <div className="flex flex-col gap-2">
        {services.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="min-w-0 flex-1"><span className="font-medium text-slate-900">{s.nameEn}</span> <span className="text-slate-400" dir="rtl">{s.nameAr}</span>{!s.showInComparison && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">not in table</span>}</span>
            <button type="button" className={btn} disabled={pending || i === 0} aria-label="Move up" onClick={() => run(() => moveService(s.id, -1))}>↑</button>
            <button type="button" className={btn} disabled={pending || i === services.length - 1} aria-label="Move down" onClick={() => run(() => moveService(s.id, 1))}>↓</button>
            <button type="button" className={btn} onClick={() => setDraft({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison })}>Edit</button>
            <button type="button" className={`${btn} !text-red-600`} disabled={pending} onClick={() => { if (confirm(`Delete “${s.nameEn}”? It is removed from every package.`)) run(() => deleteService(s.id), "Deleted."); }}>Delete</button>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-slate-400">No services yet.</p>}
      </div>
      {draft ? (
        <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className={label}>Name (English) *</span><input className={inputClassName} value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} /></label>
          <label className="flex flex-col gap-1.5"><span className={label}>الاسم (Arabic) *</span><input className={inputClassName} dir="rtl" value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.showInComparison} onChange={(e) => setDraft({ ...draft, showInComparison: e.target.checked })} />Show as a row in the comparison table</label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => run(() => saveService(draft.id, draft), "Saved.", () => setDraft(null))}>Save service</button>
            <button type="button" className={btn} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-600" onClick={() => setDraft({ id: null, nameEn: "", nameAr: "", showInComparison: true })}>+ Add service</button>
      )}
    </div>
  );
}

// ---------------- Texts & terms ----------------
function TextsTab({ settings }: { settings: PkgSettings }) {
  const { run, pending } = useRun();
  const [s, setS] = useState(settings);
  const field = (k: keyof PkgSettings, text: string, rows: number, rtl?: boolean) => (
    <label className="flex flex-col gap-1.5"><span className={label}>{text}</span><textarea className={`${inputClassName} resize-y`} rows={rows} dir={rtl ? "rtl" : undefined} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
  );
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        {field("headingEn", "Heading (English)", 2)}{field("headingAr", "العنوان (Arabic)", 2, true)}
        {field("subtitleEn", "Subtitle (English)", 4)}{field("subtitleAr", "الوصف (Arabic)", 4, true)}
        {field("noteEn", "Note under the table (English)", 2)}{field("noteAr", "ملاحظة تحت الجدول (Arabic)", 2, true)}
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <p className="text-xs text-slate-500 sm:col-span-2">Terms &amp; conditions: one term per line. The website numbers them itself, so do not type numbers.</p>
        {field("termsEn", "Terms (English)", 14)}{field("termsAr", "الشروط والأحكام (Arabic)", 14, true)}
      </div>
      <button type="button" disabled={pending} onClick={() => run(() => saveSettings(s), "Saved.")} className="self-start rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save texts"}</button>
    </div>
  );
}

// ---------------- Requests ----------------
function RequestsTab({ requests }: { requests: Request[] }) {
  const { run, pending } = useRun();
  const [edits, setEdits] = useState<Record<string, { status: string; notes: string }>>({});
  if (requests.length === 0) return <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">No subscription requests yet. They appear here when a customer presses “Subscribe now”.</p>;
  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => {
        const e = edits[r.id] ?? { status: r.status, notes: r.notes };
        const dirty = e.status !== r.status || e.notes !== r.notes;
        return (
          <div key={r.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="text-sm">
              <p className="font-semibold text-slate-900">{r.name} <span className="font-normal text-slate-400">· {new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></p>
              <p className="mt-0.5 text-blue-700">{r.packageName} — AED {r.packagePrice.toLocaleString("en-US")}/year</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-600">
                <dt className="text-slate-400">Phone</dt><dd dir="ltr"><a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="text-blue-600">{r.phone}</a></dd>
                <dt className="text-slate-400">Email</dt><dd><a href={`mailto:${r.email}`} className="text-blue-600">{r.email}</a></dd>
                <dt className="text-slate-400">Where</dt><dd>{r.emirate}{r.location ? ` — ${r.location}` : ""}</dd>
                <dt className="text-slate-400">Property</dt><dd>{r.propertyType}, {r.bedrooms === 0 ? "studio" : `${r.bedrooms} bedroom${r.bedrooms > 1 ? "s" : ""}`}, {r.acUnits} AC unit{r.acUnits > 1 ? "s" : ""}</dd>
                <dt className="text-slate-400">Activation</dt><dd>{r.activationDate ?? "No preference"}</dd>
              </dl>
            </div>
            <div className="flex flex-col gap-2">
              <select className={inputClassName} value={e.status} onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, status: ev.target.value } })} aria-label="Status">
                {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea className={`${inputClassName} resize-y`} rows={2} placeholder="Notes (only you see these)" value={e.notes} onChange={(ev) => setEdits({ ...edits, [r.id]: { ...e, notes: ev.target.value } })} />
              <button type="button" disabled={pending || !dirty} onClick={() => run(() => updateSubscription(r.id, e.status, e.notes), "Saved.", () => setEdits((x) => { const n = { ...x }; delete n[r.id]; return n; }))} className="self-start rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Save</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
