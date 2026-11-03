"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { deleteBranch, saveBranch } from "@/app/admin/website/location-actions";
import { DAYS_EN, embedUrlFor, hoursSummary, type BranchInputValue, type HoursRow } from "@/lib/locations/locations";

export type BranchRow = BranchInputValue & { id: string };
type Option = { id: string; name: string };

const blank = (areaId: string): BranchInputValue => ({
  slug: "", areaId, nameEn: "", nameAr: "", branchNameEn: "", branchNameAr: "", regionEn: "", streetEn: "", streetAr: "", localityEn: "", localityAr: "", postalCode: "", addressEn: "", addressAr: "",
  latitude: 0, longitude: 0, mapsUrl: "", mapsEmbedUrl: "", appleMapsUrl: "", businessProfileUrl: "", reviewsUrl: "", phone: "", whatsapp: "", email: "",
  hours: [], images: [], ratingValue: null, ratingCount: null, coverage: [], faqs: [], categoryIds: [], active: true, sortOrder: 0,
});

const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));
const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>
    {hint && <p className="-mt-1 text-xs text-slate-500">{hint}</p>}
    {children}
  </fieldset>
);

function BranchForm({ id, initial, areas, categories, onDone }: { id: string | null; initial: BranchInputValue; areas: Option[]; categories: Option[]; onDone: () => void }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  // text boxes keep what is typed; they become numbers / lists when saved
  const [lat, setLat] = useState(initial.latitude ? String(initial.latitude) : "");
  const [lng, setLng] = useState(initial.longitude ? String(initial.longitude) : "");
  const [coverage, setCoverage] = useState(initial.coverage.map((c) => (c.nameAr ? `${c.nameEn} | ${c.nameAr}` : c.nameEn)).join("\n"));
  const [images, setImages] = useState(initial.images.join("\n"));
  const [rating, setRating] = useState(initial.ratingValue === null ? "" : String(initial.ratingValue));
  const [count, setCount] = useState(initial.ratingCount === null ? "" : String(initial.ratingCount));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<BranchInputValue>) => setV((s) => ({ ...s, ...p }));
  const text = (k: keyof BranchInputValue, dir?: "ltr") => ({ className: inputClassName, dir, value: v[k] as string, onChange: (e: { target: { value: string } }) => set({ [k]: e.target.value } as Partial<BranchInputValue>) });

  const setHours = (i: number, p: Partial<HoursRow>) => set({ hours: v.hours.map((h, j) => (j === i ? { ...h, ...p } : h)) });
  const previewOk = Number.isFinite(num(lat)) && Number.isFinite(num(lng)) && num(lat) >= 22 && num(lat) <= 26.5 && num(lng) >= 51 && num(lng) <= 56.5;

  function save() {
    setError(null);
    const payload: BranchInputValue = {
      ...v,
      latitude: num(lat), longitude: num(lng),
      images: images.split("\n").map((x) => x.trim()).filter(Boolean),
      coverage: coverage.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [en, ar] = l.split("|").map((x) => x.trim()); return { nameEn: en, nameAr: ar ?? "" }; }),
      ratingValue: rating.trim() === "" ? null : Number(rating),
      ratingCount: count.trim() === "" ? null : Number(count),
    };
    startTransition(async () => {
      const res = await saveBranch(id, payload);
      if (res.ok) { showToast("Branch saved."); onDone(); } else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Section title="Who and where">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Emirate *"><select className={inputClassName} value={v.areaId} onChange={(e) => set({ areaId: e.target.value })}>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Code * (letters, numbers, hyphens: used in the structured-data id)"><input {...text("slug", "ltr")} placeholder="ajman" /></Field>
          <Field label="Location name (English) *"><input {...text("nameEn")} placeholder="Osta Services Ajman" /></Field>
          <Field label="اسم الموقع (Arabic) *"><input {...text("nameAr")} dir="rtl" /></Field>
          <Field label="Branch name (English)"><input {...text("branchNameEn")} placeholder="Ajman Branch" /></Field>
          <Field label="اسم الفرع (Arabic)"><input {...text("branchNameAr")} dir="rtl" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> Active (shown on the website; inactive branches are hidden everywhere)</label>
      </Section>

      <Section title="Address" hint="Only a real office has an address. Leave the full address empty to build it from the street and district.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Street / building (English)"><input {...text("streetEn")} placeholder="Paradise Lake Tower B9" /></Field>
          <Field label="الشارع / المبنى (Arabic)"><input {...text("streetAr")} dir="rtl" /></Field>
          <Field label="District (English)"><input {...text("localityEn")} placeholder="Emirates City" /></Field>
          <Field label="المنطقة (Arabic)"><input {...text("localityAr")} dir="rtl" /></Field>
          <Field label="Full address shown to visitors (English, optional)"><input {...text("addressEn")} /></Field>
          <Field label="العنوان الكامل (Arabic, optional)"><input {...text("addressAr")} dir="rtl" /></Field>
          <Field label="Postal code (optional)"><input {...text("postalCode", "ltr")} /></Field>
          <Field label="Emirate written in the address (empty = the page's emirate; Al Ain is in Abu Dhabi)"><input {...text("regionEn")} placeholder="Abu Dhabi" /></Field>
        </div>
      </Section>

      <Section title="Map" hint="Use the coordinates of the office itself, not the middle of the city. In Google Maps: right-click the office pin and click the numbers to copy them (latitude first, then longitude).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Latitude *"><input className={inputClassName} dir="ltr" inputMode="decimal" placeholder="25.3925699" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
          <Field label="Longitude *"><input className={inputClassName} dir="ltr" inputMode="decimal" placeholder="55.5760205" value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
          <Field label="Google Maps link (the place page)"><input {...text("mapsUrl", "ltr")} placeholder="https://www.google.com/maps/place/…" /></Field>
          <Field label="Apple Maps link"><input {...text("appleMapsUrl", "ltr")} placeholder="https://maps.apple.com/place?place-id=…" /></Field>
          <Field label="Google Business Profile link"><input {...text("businessProfileUrl", "ltr")} /></Field>
          <Field label="Reviews link (leave empty to use the Business Profile)"><input {...text("reviewsUrl", "ltr")} /></Field>
          <div className="sm:col-span-2"><Field label="Map embed address (optional: empty = a map at the coordinates above)"><input {...text("mapsEmbedUrl", "ltr")} placeholder="https://www.google.com/maps/embed?pb=…" /></Field></div>
        </div>
        {previewOk ? (
          <iframe title="Map preview" src={v.mapsEmbedUrl || embedUrlFor(num(lat), num(lng))} className="h-56 w-full rounded-lg border border-slate-200" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Enter the latitude and longitude (inside the UAE) to see the map preview.</p>}
      </Section>

      <Section title="Contact">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Phone"><input {...text("phone", "ltr")} placeholder="+971568676036" /></Field>
          <Field label="WhatsApp (empty = the phone)"><input {...text("whatsapp", "ltr")} /></Field>
          <Field label="Email (optional)"><input {...text("email", "ltr")} /></Field>
        </div>
      </Section>

      <Section title="Opening hours" hint="Only enter the real hours. Until you do, none are shown or published. Closing can be 24:00 for midnight.">
        {v.hours.map((h, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex flex-wrap gap-2">
              {DAYS_EN.map((d, day) => (
                <label key={d} className="flex items-center gap-1 text-xs text-slate-700"><input type="checkbox" checked={h.days.includes(day)} onChange={(e) => setHours(i, { days: e.target.checked ? [...h.days, day].sort() : h.days.filter((x) => x !== day) })} />{d.slice(0, 3)}</label>
              ))}
            </div>
            <input className={`${inputClassName} w-24`} dir="ltr" value={h.opens} placeholder="10:00" aria-label="Opens" onChange={(e) => setHours(i, { opens: e.target.value })} />
            <span className="text-slate-400">to</span>
            <input className={`${inputClassName} w-24`} dir="ltr" value={h.closes} placeholder="24:00" aria-label="Closes" onChange={(e) => setHours(i, { closes: e.target.value })} />
            <button type="button" onClick={() => set({ hours: v.hours.filter((_, j) => j !== i) })} className="text-xs font-medium text-red-600">Remove</button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => set({ hours: [...v.hours, { days: [0, 1, 2, 3, 4, 5, 6], opens: "09:00", closes: "18:00" }] })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">+ Add hours</button>
          {v.hours.length > 0 && <span className="text-xs text-slate-500">Shown as: {hoursSummary(v.hours, "en")}</span>}
        </div>
      </Section>

      <Section title="Services available at this branch" hint="Shown on the emirate page, each linking to its page when it has one.">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" checked={v.categoryIds.includes(c.id)} onChange={(e) => set({ categoryIds: e.target.checked ? [...v.categoryIds, c.id] : v.categoryIds.filter((x) => x !== c.id) })} />{c.name}</label>
          ))}
        </div>
      </Section>

      <Section title="Verified coverage areas" hint="Areas really served from this branch, one per line: English | العربية. They are listed as areas served, never as addresses.">
        <textarea className={`${inputClassName} min-h-28`} value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder={"Emirates City | مدينة الإمارات\nAl Nuaimiya | النعيمية"} />
      </Section>

      <Section title="Branch images" hint="One address per line (a Media Library address like /api/media/… or https://…). Real photos of the office and team.">
        <textarea className={`${inputClassName} min-h-20`} dir="ltr" value={images} onChange={(e) => setImages(e.target.value)} />
      </Section>

      <Section title="Google rating shown on the page" hint="Copy it from the Business Profile. It is shown as text with a link to the reviews; it is not added to structured data.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rating (0 to 5)"><input className={inputClassName} dir="ltr" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="5" /></Field>
          <Field label="Number of reviews"><input className={inputClassName} dir="ltr" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="206" /></Field>
        </div>
      </Section>

      <Section title="Questions about this location" hint="Shown on the emirate page and added to its FAQ structured data. English is required for each.">
        {v.faqs.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <Field label="Question (English)"><input className={inputClassName} value={f.question.en} onChange={(e) => set({ faqs: v.faqs.map((x, j) => (j === i ? { ...x, question: { ...x.question, en: e.target.value } } : x)) })} /></Field>
            <Field label="السؤال (Arabic)"><input className={inputClassName} dir="rtl" value={f.question.ar} onChange={(e) => set({ faqs: v.faqs.map((x, j) => (j === i ? { ...x, question: { ...x.question, ar: e.target.value } } : x)) })} /></Field>
            <Field label="Answer (English)"><textarea className={`${inputClassName} min-h-16`} value={f.answer.en} onChange={(e) => set({ faqs: v.faqs.map((x, j) => (j === i ? { ...x, answer: { ...x.answer, en: e.target.value } } : x)) })} /></Field>
            <Field label="الجواب (Arabic)"><textarea className={`${inputClassName} min-h-16`} dir="rtl" value={f.answer.ar} onChange={(e) => set({ faqs: v.faqs.map((x, j) => (j === i ? { ...x, answer: { ...x.answer, ar: e.target.value } } : x)) })} /></Field>
            <button type="button" onClick={() => set({ faqs: v.faqs.filter((_, j) => j !== i) })} className="justify-self-start text-xs font-medium text-red-600">Remove question</button>
          </div>
        ))}
        <button type="button" disabled={v.faqs.length >= 12} onClick={() => set({ faqs: [...v.faqs, { question: { en: "", ar: "" }, answer: { en: "", ar: "" } }] })} className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50">+ Add question</button>
      </Section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save branch"}</button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
      </div>
    </div>
  );
}

export function LocationManager({ branches, areas, categories, emirateStatus }: { branches: BranchRow[]; areas: Option[]; categories: Option[]; emirateStatus: { id: string; name: string; branches: number }[] }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const done = () => { setEditing(null); router.refresh(); };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Emirates</h3>
        <div className="flex flex-wrap gap-2">
          {emirateStatus.map((e) => (
            <span key={e.id} className={`rounded-full px-3 py-1 text-xs font-medium ${e.branches > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{e.name}: {e.branches > 0 ? `${e.branches} branch${e.branches > 1 ? "es" : ""}` : "service area only"}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">An emirate without a branch is shown as a place you serve: no address is displayed or published for it. Add new emirates under Service Areas.</p>
      </div>

      {editing === "new" ? (
        <BranchForm id={null} initial={blank(areas[0]?.id ?? "")} areas={areas} categories={categories} onDone={done} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ Add a branch</button>
      )}

      {branches.map((b) => (
        <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{b.nameEn} <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{b.active ? "Active" : "Inactive"}</span></p>
              <p className="mt-1 text-sm text-slate-600">{[b.streetEn, b.localityEn, areas.find((a) => a.id === b.areaId)?.name].filter(Boolean).join(", ")}</p>
              <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{b.latitude}, {b.longitude} · {b.phone || "no phone"} · {b.hours.length ? hoursSummary(b.hours, "en") : "hours not set"}</p>
            </div>
            <div className="flex gap-3 text-sm font-medium">
              <button type="button" onClick={() => setEditing(editing === b.id ? null : b.id)} className="text-blue-600">{editing === b.id ? "Close" : "Edit"}</button>
              <button type="button" disabled={pending} className="text-red-600" onClick={() => { if (confirm(`Delete ${b.nameEn}? Its section disappears from the emirate page.`)) startTransition(async () => { const r = await deleteBranch(b.id); showToast(r.ok ? "Branch deleted." : r.error ?? "Could not delete.", r.ok ? "success" : "error"); router.refresh(); }); }}>Delete</button>
            </div>
          </div>
          {editing === b.id && <div className="mt-4"><BranchForm id={b.id} initial={b} areas={areas} categories={categories} onDone={done} /></div>}
        </div>
      ))}
      {branches.length === 0 && editing !== "new" && <p className="text-sm text-slate-500">No branches yet. Add one for each real office.</p>}
    </div>
  );
}
