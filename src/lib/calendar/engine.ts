import { type CalendarConfig, type TeamRules, closedReason } from "./config";
import { MIN, addDays, at, dayKey, startOfDay, toMinutes } from "./time";

// The availability engine: which start times a team can take on a given day. Pure (no database), so every rule can be tested.
//   - the team must work that day, and the day must not be a holiday or a company closure;
//   - a visit must fit inside working hours and may not run across a break;
//   - it may not overlap another booking of the team, and a travel gap is kept after it (the other bookings already carry theirs);
//   - the team's daily limit, the minimum notice, the same-day rule and the advance limit apply.

export type Busy = { startsAt: Date; endsAt: Date; busyUntil: Date; kind?: string };

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

// The first existing period a new visit [start, end + travel) would run into, or null.
export function firstConflict<T extends Busy>(busy: T[], start: Date, end: Date, travelMinutes: number): T | null {
  const s = start.getTime(), e = end.getTime() + travelMinutes * MIN;
  return busy.find((b) => overlaps(s, e, b.startsAt.getTime(), b.busyUntil.getTime())) ?? null;
}

export type DayInput = {
  day: string; rules: TeamRules; cfg: CalendarConfig; busy: Busy[]; durationMin: number; now: Date;
  // An admin books past the customer-facing limits (notice, same-day, advance days).
  ignoreLimits?: boolean;
};

// Working segments of a day: the working window minus the breaks, as [start, end) minutes after midnight.
export function workingSegments(rules: TeamRules): [number, number][] {
  const s = toMinutes(rules.startTime), e = toMinutes(rules.endTime);
  if (s == null || e == null || e <= s) return [];
  let segs: [number, number][] = [[s, e]];
  for (const b of rules.breaks) {
    const bs = toMinutes(b.start), be = toMinutes(b.end);
    if (bs == null || be == null || be <= bs) continue;
    segs = segs.flatMap(([a, z]) => (be <= a || bs >= z ? [[a, z] as [number, number]] : [...(bs > a ? [[a, bs] as [number, number]] : []), ...(be < z ? [[be, z] as [number, number]] : [])]));
  }
  return segs;
}

export function availableStarts(i: DayInput): Date[] {
  const { day, rules, cfg, busy, durationMin, now } = i;
  if (closedReason(cfg, day)) return [];
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (!rules.workDays.includes(dow)) return [];
  const today = dayKey(now);
  if (!i.ignoreLimits) {
    if (day < today) return [];
    if (day === today && !cfg.sameDayAllowed) return [];
    if (day > addDays(today, cfg.advanceDays)) return [];
  } else if (day < today) return [];
  // The team's daily limit counts its bookings that day (blocks do not count).
  const booked = busy.filter((b) => b.kind !== "BLOCK" && dayKey(b.startsAt) === day).length;
  if (rules.maxPerDay > 0 && booked >= rules.maxPerDay) return [];
  const earliest = i.ignoreLimits ? now.getTime() : now.getTime() + cfg.minNoticeHours * 60 * MIN;
  const out: Date[] = [];
  for (const [segStart, segEnd] of workingSegments(rules)) {
    for (let t = segStart; t + durationMin <= segEnd; t += cfg.stepMinutes) {
      const start = at(day, t);
      if (start.getTime() < earliest) continue;
      if (firstConflict(busy, start, new Date(start.getTime() + durationMin * MIN), rules.travelMinutes)) continue;
      out.push(start);
    }
  }
  return out;
}

// The earliest slot of a team from `fromDay` on (within the advance limit), or null.
export function nextAvailable(i: Omit<DayInput, "day">, fromDay: string, busyForDay: (day: string) => Busy[], horizonDays = 120): { day: string; start: Date } | null {
  for (let n = 0; n <= horizonDays; n++) {
    const day = addDays(fromDay, n);
    const slots = availableStarts({ ...i, day, busy: busyForDay(day) });
    if (slots.length) return { day, start: slots[0] };
  }
  return null;
}

// Why a specific visit cannot be booked: used for a clear message when an administrator or a customer chooses an exact time.
export type Problem = { code: "closed" | "off-day" | "outside-hours" | "break" | "conflict" | "daily-limit" | "past" | "notice" | "same-day" | "advance"; message: string };

export function checkVisit(i: { rules: TeamRules; cfg: CalendarConfig; busy: Busy[]; start: Date; end: Date; now: Date; ignoreLimits?: boolean }): Problem[] {
  const { rules, cfg, start, end, now } = i;
  const out: Problem[] = [];
  const day = dayKey(start);
  const closed = closedReason(cfg, day);
  if (closed) out.push({ code: "closed", message: `${day} is closed: ${closed}.` });
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (!rules.workDays.includes(dow)) out.push({ code: "off-day", message: "The team does not work on that day." });
  const sm = Math.round((start.getTime() - startOfDay(day).getTime()) / MIN), em = Math.round((end.getTime() - startOfDay(day).getTime()) / MIN);
  const segs = workingSegments(rules);
  if (!segs.some(([a, z]) => sm >= a && em <= z)) {
    const ws = toMinutes(rules.startTime) ?? 0, we = toMinutes(rules.endTime) ?? 0;
    out.push(sm < ws || em > we || dayKey(end) !== day ? { code: "outside-hours", message: `It is outside the team's working hours (${rules.startTime}–${rules.endTime}).` } : { code: "break", message: "It runs into the team's break." });
  }
  const c = firstConflict(i.busy, start, end, rules.travelMinutes);
  if (c) out.push({ code: "conflict", message: c.kind === "BLOCK" ? "That time is blocked for the team." : "The team already has a booking that overlaps (including the travel time between visits)." });
  const booked = i.busy.filter((b) => b.kind !== "BLOCK" && dayKey(b.startsAt) === day).length;
  if (rules.maxPerDay > 0 && booked >= rules.maxPerDay) out.push({ code: "daily-limit", message: `The team's limit of ${rules.maxPerDay} bookings a day is reached.` });
  if (!i.ignoreLimits) {
    if (start.getTime() < now.getTime()) out.push({ code: "past", message: "That time has already passed." });
    else if (start.getTime() < now.getTime() + cfg.minNoticeHours * 60 * MIN) out.push({ code: "notice", message: `Bookings need at least ${cfg.minNoticeHours} hour(s) notice.` });
    if (day === dayKey(now) && !cfg.sameDayAllowed) out.push({ code: "same-day", message: "Same-day bookings are not allowed." });
    if (day > addDays(dayKey(now), cfg.advanceDays)) out.push({ code: "advance", message: `Bookings can be made up to ${cfg.advanceDays} days ahead.` });
  }
  return out;
}
