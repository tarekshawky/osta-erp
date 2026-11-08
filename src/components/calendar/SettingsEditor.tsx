"use client";

import { useState } from "react";
import { saveSettingsAction, syncExistingOrdersAction } from "@/app/admin/calendar/actions";
import type { CalendarConfig } from "@/lib/calendar/config";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0B2A6B] focus:outline-none focus:ring-2 focus:ring-[#0B2A6B]/20";
const Num = ({ label, hint, value, onChange, min = 0, max }: { label: string; hint?: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) => (
  <label className="block text-xs font-semibold text-slate-600">{label}<input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${input} mt-1 w-full`} />{hint && <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{hint}</span>}</label>
);

export function SettingsEditor({ config, services, pending, canSync = true }: { config: CalendarConfig; services: { id: string; nameEn: string }[]; pending: number; canSync?: boolean }) {
  const [c, setC] = useState(config);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<string | null>(null);
  const set = (p: Partial<CalendarConfig>) => setC({ ...c, ...p });

  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveSettingsAction(c).catch(() => ({ ok: false, error: "Something went wrong on the server. Please try again." }));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Could not save." });
  }
  async function syncNow() {
    setSync("Working…");
    const r = await syncExistingOrdersAction().catch(() => ({ ok: false, error: "Something went wrong on the server. Please try again.", created: 0, conflicts: 0, skipped: 0 }));
    setSync(r.ok ? `${r.created} order${r.created === 1 ? "" : "s"} added to the calendar${r.conflicts === 1 ? ", 1 of them clashes with another booking and shows as a conflict" : r.conflicts ? `, ${r.conflicts} of them clash with another booking and show as conflicts` : ""}${r.skipped ? `, ${r.skipped} could not be placed` : ""}.` : (r.error ?? "Could not sync."));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#DCE5F7] bg-white p-5">
        <h3 className="mb-3 text-base font-bold text-[#0B1F4D]">Booking rules</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Num label="Book up to (days ahead)" min={1} max={730} value={c.advanceDays} onChange={(advanceDays) => set({ advanceDays })} />
          <Num label="Minimum notice (hours)" max={720} value={c.minNoticeHours} onChange={(minNoticeHours) => set({ minNoticeHours })} />
          <Num label="Default visit length (min)" min={15} max={1440} value={c.defaultDurationMin} onChange={(defaultDurationMin) => set({ defaultDurationMin })} hint="For services with no length below" />
          <Num label="Offer a start every (min)" min={5} max={240} value={c.stepMinutes} onChange={(stepMinutes) => set({ stepMinutes })} />
          <Num label="Hold a chosen time (min)" min={1} max={120} value={c.holdMinutes} onChange={(holdMinutes) => set({ holdMinutes })} hint="While the customer fills in details" />
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={c.sameDayAllowed} onChange={(e) => set({ sameDayAllowed: e.target.checked })} className="h-4 w-4" /> Allow same-day bookings</label>
        <p className="mt-1 text-xs text-slate-400">These limits apply to customers. The office can always book any future time.</p>
      </section>

      <section className="rounded-2xl border border-[#DCE5F7] bg-white p-5">
        <h3 className="mb-1 text-base font-bold text-[#0B1F4D]">How long each service takes</h3>
        <p className="mb-3 text-xs text-slate-500">Minutes for one unit, plus extra minutes for each additional unit (for example 3 AC units). A service left blank uses the default length.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => {
            const v = c.services[s.id];
            const update = (p: Partial<{ minutes: number; perUnit: number }> | null) => { const next = { ...c.services }; if (p === null) delete next[s.id]; else next[s.id] = { minutes: v?.minutes ?? c.defaultDurationMin, perUnit: v?.perUnit ?? 0, ...p }; set({ services: next }); };
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{s.nameEn}</span>
                <input aria-label={`${s.nameEn} minutes`} type="number" min={5} max={1440} placeholder={String(c.defaultDurationMin)} value={v ? v.minutes : ""} onChange={(e) => (e.target.value === "" ? update(null) : update({ minutes: Number(e.target.value) }))} className={`${input} w-20`} />
                <span className="text-xs text-slate-400">min +</span>
                <input aria-label={`${s.nameEn} extra minutes per additional unit`} type="number" min={0} max={1440} disabled={!v} value={v ? v.perUnit : ""} onChange={(e) => update({ perUnit: Number(e.target.value) })} className={`${input} w-20 disabled:bg-slate-50`} />
                <span className="text-xs text-slate-400">/ extra</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#DCE5F7] bg-white p-5">
        <h3 className="mb-3 text-base font-bold text-[#0B1F4D]">Public holidays</h3>
        {c.holidays.map((h, i) => (
          <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Holiday date" value={h.date} onChange={(e) => set({ holidays: c.holidays.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} className={input} />
            <input aria-label="Holiday name" placeholder="Name" value={h.name} onChange={(e) => set({ holidays: c.holidays.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={`${input} min-w-0 flex-1`} />
            <button type="button" aria-label="Remove holiday" onClick={() => set({ holidays: c.holidays.filter((_, j) => j !== i) })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ holidays: [...c.holidays, { date: "", name: "" }] })} className="text-sm font-semibold text-[#0B2A6B] hover:underline">+ Add a holiday</button>

        <h3 className="mb-3 mt-6 text-base font-bold text-[#0B1F4D]">Company closures</h3>
        {c.closures.map((h, i) => (
          <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Closed from" value={h.from} onChange={(e) => set({ closures: c.closures.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} className={input} />
            <span className="text-slate-400">to</span>
            <input type="date" aria-label="Closed until" value={h.to} onChange={(e) => set({ closures: c.closures.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} className={input} />
            <input aria-label="Reason" placeholder="Reason" value={h.reason} onChange={(e) => set({ closures: c.closures.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })} className={`${input} min-w-0 flex-1`} />
            <button type="button" aria-label="Remove closure" onClick={() => set({ closures: c.closures.filter((_, j) => j !== i) })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ closures: [...c.closures, { from: "", to: "", reason: "" }] })} className="text-sm font-semibold text-[#0B2A6B] hover:underline">+ Add a closure</button>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#0B2A6B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>

      {canSync && (
        <section className="rounded-2xl border border-[#DCE5F7] bg-white p-5">
          <h3 className="mb-1 text-base font-bold text-[#0B1F4D]">Orders that already exist</h3>
          <p className="mb-3 max-w-2xl text-sm text-slate-500">{pending > 0 ? `${pending} existing order${pending === 1 ? " has" : "s have"} a team and a time but ${pending === 1 ? "is" : "are"} not on the calendar yet.` : "Every existing order of a team on the calendar is already on it."} Adding them closes those times for other bookings. Orders that already overlap are kept and shown in red as conflicts.</p>
          <button type="button" disabled={pending === 0 || sync === "Working…"} onClick={syncNow} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Add existing orders to the calendar</button>
          {sync && <p role="status" className="mt-2 text-sm text-slate-600">{sync}</p>}
        </section>
      )}
    </div>
  );
}
