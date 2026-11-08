"use client";

import { useState } from "react";
import { saveTeamScheduleAction } from "@/app/admin/calendar/actions";
import type { TeamRules } from "@/lib/calendar/config";

export type TeamRow = { id: string; name: string; active: boolean; regionIds: string[]; serviceIds: string[]; rules: TeamRules };
type Opt = { id: string; nameEn: string };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0B2A6B] focus:outline-none focus:ring-2 focus:ring-[#0B2A6B]/20";

function Chips({ options, value, onChange, empty }: { options: Opt[]; value: string[]; onChange: (v: string[]) => void; empty: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id);
          return <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-[#0B2A6B] bg-[#0B2A6B] text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>{o.nameEn}</button>;
        })}
      </div>
      {value.length === 0 && <p className="mt-1 text-xs text-slate-400">{empty}</p>}
    </div>
  );
}

function TeamCard({ team, regions, services }: { team: TeamRow; regions: Opt[]; services: Opt[] }) {
  const [t, setT] = useState(team);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const rules = t.rules;
  const setRules = (r: Partial<TeamRules>) => setT({ ...t, rules: { ...rules, ...r } });
  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveTeamScheduleAction(t.id, { active: t.active, regionIds: t.regionIds, serviceIds: t.serviceIds, rules }).catch(() => ({ ok: false, error: "Something went wrong on the server. Please try again." }));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Could not save." });
  }
  return (
    <section className="rounded-2xl border border-[#DCE5F7] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="mr-auto text-lg font-bold text-[#0B1F4D]">{t.name}</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} className="h-4 w-4" /> On the calendar
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Working days</p>
            <div className="flex gap-1.5">{DAYS.map((d, i) => { const on = rules.workDays.includes(i); return <button key={d} type="button" aria-pressed={on} onClick={() => setRules({ workDays: on ? rules.workDays.filter((x) => x !== i) : [...rules.workDays, i].sort() })} className={`h-9 w-11 rounded-lg border text-xs font-semibold ${on ? "border-[#0B2A6B] bg-[#0B2A6B] text-white" : "border-slate-300 bg-white text-slate-500"}`}>{d}</button>; })}</div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block text-xs font-semibold text-slate-600">Starts<input type="time" value={rules.startTime} onChange={(e) => setRules({ startTime: e.target.value })} className={`${input} mt-1 w-full`} /></label>
            <label className="block text-xs font-semibold text-slate-600">Ends<input type="time" value={rules.endTime} onChange={(e) => setRules({ endTime: e.target.value })} className={`${input} mt-1 w-full`} /></label>
            <label className="block text-xs font-semibold text-slate-600">Travel (min)<input type="number" min={0} max={480} value={rules.travelMinutes} onChange={(e) => setRules({ travelMinutes: Number(e.target.value) })} className={`${input} mt-1 w-full`} /></label>
            <label className="block text-xs font-semibold text-slate-600">Max / day<input type="number" min={0} max={100} value={rules.maxPerDay} onChange={(e) => setRules({ maxPerDay: Number(e.target.value) })} className={`${input} mt-1 w-full`} /><span className="mt-0.5 block text-[10px] font-normal text-slate-400">0 = no limit</span></label>
          </div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Breaks</p>
            {rules.breaks.map((b, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2">
                <input type="time" aria-label="Break starts" value={b.start} onChange={(e) => setRules({ breaks: rules.breaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} className={input} />
                <span className="text-slate-400">to</span>
                <input type="time" aria-label="Break ends" value={b.end} onChange={(e) => setRules({ breaks: rules.breaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} className={input} />
                <button type="button" aria-label="Remove break" onClick={() => setRules({ breaks: rules.breaks.filter((_, j) => j !== i) })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">✕</button>
              </div>
            ))}
            {rules.breaks.length < 6 && <button type="button" onClick={() => setRules({ breaks: [...rules.breaks, { start: "13:00", end: "14:00" }] })} className="text-sm font-semibold text-[#0B2A6B] hover:underline">+ Add a break</button>}
          </div>
        </div>
        <div className="space-y-4">
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Emirates this team covers</p><Chips options={regions} value={t.regionIds} onChange={(regionIds) => setT({ ...t, regionIds })} empty="All emirates" /></div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Services this team does</p><Chips options={services} value={t.serviceIds} onChange={(serviceIds) => setT({ ...t, serviceIds })} empty="All services" /></div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#0B2A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save schedule"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}

export function TeamScheduleEditor({ teams, regions, services }: { teams: TeamRow[]; regions: Opt[]; services: Opt[] }) {
  if (!teams.length) return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">There are no teams yet. Create teams first, then set their schedules here.</p>;
  return <div className="space-y-5">{teams.map((t) => <TeamCard key={t.id} team={t} regions={regions} services={services} />)}</div>;
}
