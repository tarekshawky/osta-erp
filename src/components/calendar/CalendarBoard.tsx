"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CalendarItem } from "@/lib/calendar/service";
import { STATUS_STYLE, type CalStatus } from "@/lib/calendar/status";
import { addDays, dayKey, fromMinutes, minutesOfDay, startOfMonth, toLocalValue, weekday } from "@/lib/calendar/time";
import { addBlockAction, addBookingAction, historyAction, moveEntryAction, removeBlockAction, type CalResult } from "@/app/admin/calendar/actions";

export type BoardTeam = { id: string; name: string; regionIds: string[]; serviceIds: string[]; startTime: string; endTime: string; breaks: { start: string; end: string }[]; workDays: number[]; maxPerDay: number };
export type TeamDay = { teamId: string; bookings: number; free: number; off: boolean; note: string };
type Opt = { id: string; nameEn: string };
type Emp = { id: string; name: string; teamId: string | null };
type Props = {
  view: "day" | "week" | "month"; date: string; today: string; teamFilter: string; regionFilter: string;
  items: CalendarItem[]; teams: BoardTeam[]; regions: Opt[]; services: Opt[]; employees: Emp[]; stats: TeamDay[];
  can: { manage: boolean; override: boolean }; firstDay: string; days: number; defaultDuration: number; step: number; durations: Record<string, { minutes: number; perUnit: number }>;
};

const CRASH: CalResult = { ok: false, error: "Something went wrong on the server. Nothing was changed. Please try again." };
// A server action that throws must still end the "Saving…" state and tell the person, never leave the screen frozen.
const safe = async (run: () => Promise<CalResult>): Promise<CalResult> => { try { return await run(); } catch { return CRASH; } };

const HOUR_H = 56;
const STATUSES: CalStatus[] = ["Confirmed", "In Progress", "Pending", "Completed", "Cancelled", "Conflict", "Blocked"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (iso: string) => fromMinutes(minutesOfDay(new Date(iso)));
const longDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const monthName = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

// Items that overlap in time are drawn side by side instead of on top of each other.
function layout(items: CalendarItem[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const out = new Map<string, { col: number; cols: number }>();
  let group: CalendarItem[] = [], groupEnd = 0;
  const flush = () => {
    const ends: number[] = [];
    const place = new Map<string, number>();
    for (const it of group) {
      const s = new Date(it.startsAt).getTime();
      let c = ends.findIndex((e) => e <= s);
      if (c < 0) { c = ends.length; ends.push(0); }
      ends[c] = new Date(it.endsAt).getTime();
      place.set(it.id, c);
    }
    for (const it of group) out.set(it.id, { col: place.get(it.id)!, cols: ends.length });
    group = [];
  };
  for (const it of sorted) {
    const s = new Date(it.startsAt).getTime();
    if (group.length && s >= groupEnd) flush();
    group.push(it);
    groupEnd = Math.max(groupEnd, new Date(it.endsAt).getTime());
  }
  flush();
  return out;
}

export function CalendarBoard(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [booking, setBooking] = useState<{ start: string; teamId: string } | null>(null);
  const [blocking, setBlocking] = useState<{ start: string; teamId: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const dragRef = useRef<{ item: CalendarItem; grabMin: number } | null>(null);

  const go = (next: Record<string, string>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) { if (v) q.set(k, v); else q.delete(k); }
    router.push(`${pathname}?${q.toString()}`);
  };
  const refresh = () => startTransition(() => router.refresh());
  const step = p.view === "day" ? 1 : p.view === "week" ? 7 : 0;
  const shift = (dir: 1 | -1) => go({ date: p.view === "month" ? addDays(startOfMonth(p.date), dir === 1 ? 32 : -1) : addDays(p.date, dir * step) });
  const title = p.view === "day" ? longDay(p.date) : p.view === "week" ? `${shortDay(p.firstDay)} – ${shortDay(addDays(p.firstDay, 6))}` : monthName(p.date);

  const shownTeams = p.teamFilter ? p.teams.filter((t) => t.id === p.teamFilter) : p.regionFilter ? p.teams.filter((t) => !t.regionIds.length || t.regionIds.includes(p.regionFilter)) : p.teams;
  const visible = p.items.filter((i) => i.status !== "Cancelled" || i.kind === "BLOCK");

  // The hours the grid shows: the earliest start to the latest end of the teams on screen (never narrower than 07:00-19:00).
  const [gridStart, gridEnd] = useMemo(() => {
    let s = 7, e = 19;
    for (const t of shownTeams) { s = Math.min(s, Number(t.startTime.slice(0, 2))); e = Math.max(e, Math.ceil(Number(t.endTime.slice(0, 2)) + Number(t.endTime.slice(3)) / 60)); }
    for (const i of visible) {
      if (p.view === "month") break;
      s = Math.min(s, Math.floor(minutesOfDay(new Date(i.startsAt)) / 60));
      e = Math.max(e, Math.ceil(minutesOfDay(new Date(i.endsAt)) / 60) || 24);
    }
    return [Math.max(0, s), Math.min(24, e)];
  }, [shownTeams, visible, p.view]);

  const say = (r: CalResult, ok: string) => setNotice(r.ok ? { kind: "ok", text: ok } : { kind: "error", text: r.error ?? "Something went wrong." });

  async function drop(item: CalendarItem, day: string, minutes: number, teamId?: string) {
    if (!p.can.manage) return;
    const start = `${day}T${fromMinutes(Math.max(0, Math.min(23 * 60 + 59, minutes)))}`;
    if (start === toLocalValue(new Date(item.startsAt)) && (!teamId || teamId === item.teamId)) return;
    let r = await safe(() => moveEntryAction(item.id, { start, teamId }));
    if (!r.ok && r.conflict && p.can.override && window.confirm(`${r.error}\n\nMove it anyway? It will show as a conflict.`)) r = await safe(() => moveEntryAction(item.id, { start, teamId, override: true }));
    say(r, "The booking was moved. The order was updated to match.");
    if (r.ok) refresh();
  }

  function slotFromEvent(e: React.DragEvent<HTMLElement>, grabMin: number): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = gridStart * 60 + ((e.clientY - rect.top) / HOUR_H) * 60 - grabMin;
    return Math.round(raw / p.step) * p.step;
  }

  const card = (it: CalendarItem, pos: { col: number; cols: number } | undefined, compact = false) => {
    const st = STATUS_STYLE[it.status];
    const s = minutesOfDay(new Date(it.startsAt)), e = it.endsAt && minutesOfDay(new Date(it.endsAt)) || 24 * 60;
    const top = ((s - gridStart * 60) / 60) * HOUR_H, height = Math.max(((Math.max(e, s + 15) - s) / 60) * HOUR_H, 26);
    const width = 100 / (pos?.cols ?? 1);
    const travel = it.kind === "BOOKING" ? ((new Date(it.busyUntil).getTime() - new Date(it.endsAt).getTime()) / 60000 / 60) * HOUR_H : 0;
    return (
      <div key={it.id}>
        <button
          type="button" draggable={p.can.manage}
          onDragStart={(ev) => { dragRef.current = { item: it, grabMin: ((ev.clientY - ev.currentTarget.getBoundingClientRect().top) / HOUR_H) * 60 }; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", it.id); }}
          onDragEnd={() => { dragRef.current = null; }}
          onClick={() => setSelected(it)}
          title={`${it.orderNumber || "Blocked"} · ${it.customerName || it.reason} · ${hhmm(it.startsAt)}–${hhmm(it.endsAt)} · ${it.status}`}
          style={{ top, height, left: `calc(${(pos?.col ?? 0) * width}% + 2px)`, width: `calc(${width}% - 4px)`, background: st.bg, borderLeft: `4px solid ${st.border}`, color: st.text }}
          className="absolute z-10 cursor-pointer overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm ring-1 ring-black/5 hover:ring-2 hover:ring-[#0B2A6B]/40"
        >
          <span className="block truncate font-semibold">{it.kind === "BLOCK" ? `Blocked${it.reason ? ` · ${it.reason}` : ""}` : `${it.orderNumber} · ${it.customerName}`}</span>
          {!compact && it.kind === "BOOKING" && (
            <>
              <span className="block truncate">{hhmm(it.startsAt)}–{hhmm(it.endsAt)} · {it.serviceName}</span>
              {height > 56 && <span className="block truncate">{[it.regionName, it.area].filter(Boolean).join(" · ")}</span>}
              {height > 72 && <span className="block truncate">{it.teamName} · {it.phone}</span>}
              {height > 88 && <span className="mt-0.5 inline-block rounded bg-white/60 px-1 font-medium">{it.status}</span>}
            </>
          )}
          {!compact && it.kind === "BLOCK" && <span className="block truncate">{hhmm(it.startsAt)}–{hhmm(it.endsAt)} · {it.teamName}</span>}
        </button>
        {travel > 4 && <div aria-hidden className="pointer-events-none absolute z-0 rounded-b-md opacity-70" style={{ top: top + height, height: travel, left: `calc(${(pos?.col ?? 0) * width}% + 2px)`, width: `calc(${width}% - 4px)`, backgroundImage: "repeating-linear-gradient(135deg,#cbd5e1 0 4px,transparent 4px 8px)" }} />}
      </div>
    );
  };

  const hours = Array.from({ length: gridEnd - gridStart }, (_, i) => gridStart + i);
  const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  // Time the team is not working (before it starts, after it ends, and its breaks) is shaded so it is clear why nothing is offered there.
  const shadeFor = (t: BoardTeam): [number, number][] => [[0, mins(t.startTime)], [mins(t.endTime), 24 * 60], ...t.breaks.map((b) => [mins(b.start), mins(b.end)] as [number, number])];
  const column = (key: string, day: string, teamId: string | undefined, its: CalendarItem[], headerNode: React.ReactNode, off = false, shade: [number, number][] = []) => {
    const pos = layout(its);
    return (
      <div key={key} className="min-w-[200px] flex-1 border-l border-[#E3EAF8]">
        <div className="sticky top-0 z-20 border-b border-[#DCE5F7] bg-white px-2 py-2 text-center">{headerNode}</div>
        <div
          className={`relative ${off ? "bg-slate-50" : ""}`} style={{ height: hours.length * HOUR_H }}
          onDragOver={(e) => { if (dragRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
          onDrop={(e) => { e.preventDefault(); const d = dragRef.current; dragRef.current = null; if (d) void drop(d.item, day, slotFromEvent(e, d.grabMin), teamId); }}
          onDoubleClick={(e) => { if (!p.can.manage || e.target !== e.currentTarget) return; const m = slotFromEvent(e as unknown as React.DragEvent<HTMLElement>, 0); setBooking({ start: `${day}T${fromMinutes(Math.max(0, m))}`, teamId: teamId ?? (p.teamFilter || "auto") }); }}
        >
          {shade.map(([a, b], i) => { const top = Math.max(0, ((a - gridStart * 60) / 60) * HOUR_H), bottom = Math.min(hours.length * HOUR_H, ((b - gridStart * 60) / 60) * HOUR_H); return bottom > top ? <div key={i} aria-hidden className="pointer-events-none absolute inset-x-0 bg-slate-100/80" style={{ top, height: bottom - top }} /> : null; })}
          {hours.map((h, i) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-[#EEF2FA]" style={{ top: i * HOUR_H }} />)}
          {its.map((it) => card(it, pos.get(it.id)))}
        </div>
      </div>
    );
  };

  const timeAxis = (
    <div className="w-12 shrink-0 text-right text-[11px] text-slate-400">
      <div className="sticky top-0 z-20 h-[53px] border-b border-[#DCE5F7] bg-white" />
      <div className="relative" style={{ height: hours.length * HOUR_H }}>{hours.map((h, i) => <span key={h} className="absolute right-1.5 -translate-y-1/2" style={{ top: i * HOUR_H }}>{i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}</span>)}</div>
    </div>
  );

  const stat = (id: string) => p.stats.find((s) => s.teamId === id);
  const dayView = (
    <div className="flex overflow-x-auto rounded-xl border border-[#DCE5F7] bg-white">
      {timeAxis}
      {shownTeams.length === 0 && <p className="p-6 text-sm text-slate-500">No team matches these filters.</p>}
      {shownTeams.map((t) => {
        const s = stat(t.id);
        const its = visible.filter((i) => i.teamId === t.id);
        return column(t.id, p.date, t.id, its, (
          <>
            <p className="truncate text-sm font-semibold text-[#0B1F4D]">{t.name}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{s?.bookings ?? 0} booking{s?.bookings === 1 ? "" : "s"}{t.maxPerDay ? ` / ${t.maxPerDay}` : ""} · <span className={s?.off ? "text-slate-400" : s && s.free === 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{s?.off ? s.note : s && s.free === 0 ? "Fully booked" : "Available"}</span></p>
          </>
        ), !!s?.off, shadeFor(t));
      })}
    </div>
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(p.firstDay, i));
  const weekView = (
    <div className="flex overflow-x-auto rounded-xl border border-[#DCE5F7] bg-white">
      {timeAxis}
      {weekDays.map((d) => {
        const its = visible.filter((i) => dayKey(new Date(i.startsAt)) === d && (!p.teamFilter || i.teamId === p.teamFilter));
        const n = its.filter((i) => i.kind === "BOOKING").length;
        return column(d, d, undefined, its, (
          <button type="button" onClick={() => go({ view: "day", date: d })} className="w-full">
            <p className={`text-sm font-semibold ${d === p.today ? "text-[#0B2A6B]" : "text-[#0B1F4D]"}`}>{shortDay(d)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{n} booking{n === 1 ? "" : "s"}</p>
          </button>
        ), false);
      })}
    </div>
  );

  const monthDays = Array.from({ length: p.days }, (_, i) => addDays(p.firstDay, i));
  const monthView = (
    <div className="overflow-x-auto rounded-xl border border-[#DCE5F7] bg-white">
      <div className="grid min-w-[720px] grid-cols-7 border-b border-[#DCE5F7] bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{monthDays.slice(0, 7).map((d) => <div key={d} className="py-2">{WEEKDAYS[weekday(d)]}</div>)}</div>
      <div className="grid min-w-[720px] grid-cols-7">
        {monthDays.map((d) => {
          const its = visible.filter((i) => dayKey(new Date(i.startsAt)) === d && (!p.teamFilter || i.teamId === p.teamFilter));
          const inMonth = d.slice(0, 7) === p.date.slice(0, 7);
          return (
            <div
              key={d} className={`min-h-[104px] border-b border-l border-[#EEF2FA] p-1.5 ${inMonth ? "" : "bg-slate-50/70"}`}
              onDragOver={(e) => { if (dragRef.current) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const dr = dragRef.current; dragRef.current = null; if (dr) void drop(dr.item, d, minutesOfDay(new Date(dr.item.startsAt))); }}
            >
              <button type="button" onClick={() => go({ view: "day", date: d })} className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${d === p.today ? "bg-[#0B2A6B] text-white" : inMonth ? "text-[#0B1F4D] hover:bg-slate-100" : "text-slate-400 hover:bg-slate-100"}`}>{Number(d.slice(8))}</button>
              <div className="space-y-0.5">
                {its.slice(0, 3).map((it) => {
                  const st = STATUS_STYLE[it.status];
                  return (
                    <button key={it.id} type="button" draggable={p.can.manage} onDragStart={(ev) => { dragRef.current = { item: it, grabMin: 0 }; ev.dataTransfer.setData("text/plain", it.id); }} onDragEnd={() => { dragRef.current = null; }} onClick={() => setSelected(it)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px]" style={{ background: st.bg, borderLeft: `3px solid ${st.border}`, color: st.text }}>
                      {hhmm(it.startsAt)} {it.kind === "BLOCK" ? `Blocked${it.reason ? ` · ${it.reason}` : ""}` : it.customerName}
                    </button>
                  );
                })}
                {its.length > 3 && <button type="button" onClick={() => go({ view: "day", date: d })} className="px-1 text-[11px] font-medium text-[#0B2A6B] hover:underline">+{its.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go({ date: p.today })} className="rounded-lg border border-[#DCE5F7] bg-white px-3 py-1.5 text-sm font-medium text-[#0B1F4D] hover:bg-slate-50">Today</button>
          <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="rounded-lg border border-[#DCE5F7] bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50">‹</button>
          <button type="button" aria-label="Next" onClick={() => shift(1)} className="rounded-lg border border-[#DCE5F7] bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50">›</button>
        </div>
        <h2 className="mr-auto min-w-0 truncate text-lg font-bold text-[#0B1F4D]">{title}</h2>
        <div className="flex overflow-hidden rounded-lg border border-[#DCE5F7] bg-white text-sm" role="tablist" aria-label="View">
          {(["day", "week", "month"] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={p.view === v} onClick={() => go({ view: v })} className={`px-3 py-1.5 font-medium capitalize ${p.view === v ? "bg-[#0B2A6B] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{v}</button>)}
        </div>
        <select aria-label="Emirate" value={p.regionFilter} onChange={(e) => go({ region: e.target.value, team: "" })} className="rounded-lg border border-[#DCE5F7] bg-white px-2.5 py-1.5 text-sm">
          <option value="">All emirates</option>{p.regions.map((r) => <option key={r.id} value={r.id}>{r.nameEn}</option>)}
        </select>
        <select aria-label="Team" value={p.teamFilter} onChange={(e) => go({ team: e.target.value })} className="rounded-lg border border-[#DCE5F7] bg-white px-2.5 py-1.5 text-sm">
          <option value="">All teams</option>{p.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {p.can.manage && (
          <>
            <button type="button" disabled={!p.teams.length} onClick={() => setBooking({ start: `${p.view === "day" ? p.date : p.today}T09:00`, teamId: p.teamFilter || "auto" })} className="rounded-lg bg-[#0B2A6B] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#0a2358] disabled:opacity-50">+ Add Booking</button>
            <button type="button" disabled={!p.teams.length} onClick={() => setBlocking({ start: `${p.view === "day" ? p.date : p.today}T09:00`, teamId: p.teamFilter || p.teams[0]?.id || "" })} className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Block Time</button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Status colours">
        {STATUSES.map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_STYLE[s].dot }} />{s}</span>)}
        <span className="text-slate-400">Hatched strip = travel time · drag a booking to reschedule it</span>
      </div>

      {notice && <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${notice.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.text} <button type="button" className="ml-2 underline" onClick={() => setNotice(null)}>Dismiss</button></p>}

      {!p.teams.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-[#0B1F4D]">No team is on the calendar yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Set up a team&apos;s working days, hours and emirates, and switch it on. Teams that are not switched on keep working exactly as before.</p>
          <Link href="/admin/calendar/teams" className="mt-4 inline-block rounded-lg bg-[#0B2A6B] px-4 py-2 text-sm font-semibold text-white">Set up team schedules</Link>
        </div>
      ) : p.view === "day" ? dayView : p.view === "week" ? weekView : monthView}

      {selected && <Details item={selected} teams={p.teams} can={p.can} onClose={() => setSelected(null)} onDone={(text) => { setSelected(null); setNotice({ kind: "ok", text }); refresh(); }} />}
      {booking && <BookingModal {...p} initial={booking} onClose={() => setBooking(null)} onDone={(text) => { setBooking(null); setNotice({ kind: "ok", text }); refresh(); }} />}
      {blocking && <BlockModal teams={p.teams} can={p.can} initial={blocking} onClose={() => setBlocking(null)} onDone={() => { setBlocking(null); setNotice({ kind: "ok", text: "The time is blocked." }); refresh(); }} />}
    </div>
  );
}

// ---------- shared bits ----------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="my-6 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><h3 className="text-base font-bold text-[#0B1F4D]">{title}</h3><button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">✕</button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0B2A6B] focus:outline-none focus:ring-2 focus:ring-[#0B2A6B]/20";
const Label = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{t}</span>{children}</label>;

// ---------- booking details ----------

function Details({ item, teams, can, onClose, onDone }: { item: CalendarItem; teams: BoardTeam[]; can: Props["can"]; onClose: () => void; onDone: (text: string) => void }) {
  const [start, setStart] = useState(toLocalValue(new Date(item.startsAt)));
  const [end, setEnd] = useState(toLocalValue(new Date(item.endsAt)));
  const [teamId, setTeamId] = useState(item.teamId);
  const [error, setError] = useState<{ text: string; conflict: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ action: string; actorName: string; detail: string; at: string }[] | null>(null);
  useEffect(() => { let live = true; void safe(() => historyAction(item.id)).then((r) => live && setHistory(r.history ?? [])); return () => { live = false; }; }, [item.id]);
  const st = STATUS_STYLE[item.status];

  async function save(override = false) {
    setBusy(true); setError(null);
    const r = await safe(() => moveEntryAction(item.id, { start, end, teamId, override }));
    setBusy(false);
    if (r.ok) onDone("The booking was updated. The order was updated to match."); else setError({ text: r.error ?? "Could not save.", conflict: !!r.conflict });
  }
  async function unblock() {
    setBusy(true);
    const r = await safe(() => removeBlockAction(item.id));
    setBusy(false);
    if (r.ok) onDone("The block was removed."); else setError({ text: r.error ?? "Could not remove.", conflict: false });
  }

  return (
    <Modal title={item.kind === "BLOCK" ? "Blocked time" : `Booking ${item.orderNumber}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{item.status}</span><span className="text-sm text-slate-600">{item.teamName}</span></div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {item.kind === "BOOKING" ? (
          <>
            <Row k="Customer" v={item.customerName} /><Row k="Phone" v={item.phone} />
            <Row k="Service" v={`${item.serviceName}${item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ""}`} /><Row k="Emirate / area" v={[item.regionName, item.area].filter(Boolean).join(" · ")} />
            <Row k="Order status" v={item.orderStatus} />{item.notes && <Row k="Notes" v={item.notes} />}
          </>
        ) : <Row k="Reason" v={item.reason || "—"} />}
      </dl>
      {item.orderId && <Link href={`/admin/orders/${item.orderId}`} className="mt-3 inline-block text-sm font-semibold text-[#0B2A6B] hover:underline">Open order {item.orderNumber} →</Link>}

      {can.manage && (
        <div className="mt-5 rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{item.kind === "BLOCK" ? "Change blocked time" : "Reschedule or change team"}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Label t="Start (UAE time)"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></Label>
            <Label t="End"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></Label>
            <Label t="Team"><select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={field}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Label>
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error.text}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => save()} className="rounded-lg bg-[#0B2A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save changes</button>
            {error?.conflict && can.override && <button type="button" disabled={busy} onClick={() => save(true)} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Save anyway (override)</button>}
            {item.kind === "BLOCK" && <button type="button" disabled={busy} onClick={unblock} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Remove block</button>}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Activity</p>
        {history === null ? <p className="text-sm text-slate-400">Loading…</p> : history.length === 0 ? <p className="text-sm text-slate-400">No activity yet.</p> : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {history.map((h, i) => <li key={i} className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold capitalize text-slate-800">{h.action}</span> <span className="text-slate-500">by {h.actorName} · {new Date(h.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" })}</span>{h.detail && <p className="text-slate-600">{h.detail}</p>}</li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v || "—"}</dd></div>;

// ---------- add booking ----------

function BookingModal(p: Props & { initial: { start: string; teamId: string }; onClose: () => void; onDone: (text: string) => void }) {
  const [f, setF] = useState({ customerName: "", phone: "", regionId: p.regions[0]?.id ?? "", area: "", serviceId: p.services[0]?.id ?? "", quantity: "1", teamId: p.initial.teamId, employeeId: "", notes: "", start: p.initial.start, end: "", override: false });
  const [endTouched, setEndTouched] = useState(false);
  const [error, setError] = useState<{ text: string; conflict: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  // The visit length comes from the service (plus extra time for more units) until the end time is typed by hand.
  const minutes = (() => { const d = p.durations[f.serviceId]; const q = Math.max(1, Number(f.quantity) || 1); return d ? d.minutes + d.perUnit * (q - 1) : p.defaultDuration; })();
  const autoEnd = (() => { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(f.start); if (!m) return ""; const total = Number(m[2]) * 60 + Number(m[3]) + minutes; if (total >= 24 * 60) return `${addDays(m[1], Math.floor(total / 1440))}T${fromMinutes(total % 1440)}`; return `${m[1]}T${fromMinutes(total)}`; })();
  const end = endTouched ? f.end : autoEnd;

  const eligible = p.teams.filter((t) => (!t.regionIds.length || t.regionIds.includes(f.regionId)) && (!t.serviceIds.length || t.serviceIds.includes(f.serviceId)));
  const staff = p.employees.filter((e) => e.teamId === f.teamId);

  async function submit(override = false) {
    setBusy(true); setError(null);
    const r = await safe(() => addBookingAction({ ...f, end, quantity: Number(f.quantity) || 1, override }));
    setBusy(false);
    if (r.ok) p.onDone(`Booking ${r.orderNumber} was created and the time is now closed for that team.`); else setError({ text: r.error ?? "Could not create the booking.", conflict: !!r.conflict });
  }

  return (
    <Modal title="Add Booking" onClose={p.onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(f.override); }} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Label t="Customer name"><input required value={f.customerName} onChange={(e) => set("customerName", e.target.value)} className={field} /></Label>
        <Label t="Phone"><input required inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={field} placeholder="+971…" /></Label>
        <Label t="Emirate"><select value={f.regionId} onChange={(e) => set("regionId", e.target.value)} className={field}>{p.regions.map((r) => <option key={r.id} value={r.id}>{r.nameEn}</option>)}</select></Label>
        <Label t="Area"><input value={f.area} onChange={(e) => set("area", e.target.value)} className={field} /></Label>
        <Label t="Service"><select value={f.serviceId} onChange={(e) => set("serviceId", e.target.value)} className={field}>{p.services.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</select></Label>
        <Label t="Quantity"><input type="number" min={1} value={f.quantity} onChange={(e) => set("quantity", e.target.value)} className={field} /></Label>
        <Label t="Start (UAE time)"><input required type="datetime-local" step={p.step * 60} value={f.start} onChange={(e) => set("start", e.target.value)} className={field} /></Label>
        <Label t={`End · ${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m ` : ""}from the service`}><input required type="datetime-local" step={p.step * 60} value={end} onChange={(e) => { setEndTouched(true); set("end", e.target.value); }} className={field} /></Label>
        <Label t="Team"><select value={f.teamId} onChange={(e) => { set("teamId", e.target.value); set("employeeId", ""); }} className={field}><option value="auto">Auto — first free team</option>{eligible.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Label>
        <Label t="Technician (optional)"><select value={f.employeeId} onChange={(e) => set("employeeId", e.target.value)} disabled={f.teamId === "auto"} className={field}><option value="">Not assigned yet</option>{staff.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Label>
        <div className="sm:col-span-2"><Label t="Notes"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={field} /></Label></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error.text}</p>}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-[#0B2A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Create booking"}</button>
          {error?.conflict && p.can.override && <button type="button" disabled={busy} onClick={() => submit(true)} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Book anyway (override)</button>}
          <button type="button" onClick={p.onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- block time ----------

function BlockModal({ teams, can, initial, onClose, onDone }: { teams: BoardTeam[]; can: Props["can"]; initial: { start: string; teamId: string }; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ teamId: initial.teamId, start: initial.start, end: initial.start.replace(/T.*/, "T18:00"), reason: "" });
  const [error, setError] = useState<{ text: string; conflict: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(override = false) {
    setBusy(true); setError(null);
    const r = await safe(() => addBlockAction({ ...f, override }));
    setBusy(false);
    if (r.ok) onDone(); else setError({ text: r.error ?? "Could not block the time.", conflict: true });
  }
  return (
    <Modal title="Block Time" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Label t="Team"><select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })} className={field}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Label>
        <Label t="Reason (leave, maintenance, training…)"><input list="block-reasons" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={field} /><datalist id="block-reasons"><option value="Leave" /><option value="Vehicle maintenance" /><option value="Training" /><option value="Emergency" /></datalist></Label>
        <Label t="From (UAE time)"><input required type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className={field} /></Label>
        <Label t="Until"><input required type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} className={field} /></Label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error.text}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-[#0B2A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Block this time"}</button>
          {error && can.override && <button type="button" disabled={busy} onClick={() => submit(true)} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Block anyway (override)</button>}
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
