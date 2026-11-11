import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { closedReason, durationFor, type CalendarConfig } from "./config";
import { availableStarts, type Busy } from "./engine";
import { EXCLUSION, checkSlot, fmt, loadSettings, lock, log, toSchedule, type ScheduleRow, type Tx, type TeamSchedule } from "./service";
import { DAY_MS, MIN, addDays, dayKey, fromLocalValue, fromMinutes, minutesOfDay, startOfDay } from "./time";

// The customer's side of the calendar: which times can be booked, a short hold on the time they chose, and turning that hold into their booking.
// Team names never leave this module: a customer only ever sees times. A hold is a calendar entry of its own (kind HOLD) so the same database
// protection covers it, and it stops counting when it expires.

export type Line = { serviceId: string; quantity: number };
export type PublicResult<T = object> = ({ ok: true } & T) | { ok: false; code: string; error: string };
const fail = (code: string, error: string): { ok: false; code: string; error: string } => ({ ok: false, code, error });

export type DaySlots = { day: string; closed: string | null; slots: { time: string; ok: boolean }[] };
export type Availability =
  | { managed: false }
  | { managed: true; durationMin: number; stepMinutes: number; holdMinutes: number; days: DaySlots[]; first: { day: string; time: string } | null };

// The teams the calendar manages that cover this emirate and every one of the services (an empty list on a team means "all").
async function eligibleTeams(regionId: string, lines: Line[]): Promise<TeamSchedule[]> {
  const rows = (await prisma.teamSchedule.findMany({ where: { active: true } })) as unknown as ScheduleRow[];
  const services = [...new Set(lines.map((l) => l.serviceId))];
  return rows
    .map((r) => toSchedule(r))
    .filter((s) => (!s.regionIds.length || s.regionIds.includes(regionId)) && services.every((id) => !s.serviceIds.length || s.serviceIds.includes(id)));
}

// One visit covers every service booked together, so its length is the sum of theirs.
export const visitMinutes = (cfg: CalendarConfig, lines: Line[]) => lines.reduce((sum, l) => sum + durationFor(cfg, l.serviceId, l.quantity), 0);

// "serviceId:quantity,serviceId:quantity" (the services booked together for one visit).
export function parseLines(raw: string | null): { serviceId: string; quantity: number }[] | null {
  if (!raw) return null;
  const parts = raw.split(",").filter(Boolean);
  if (!parts.length || parts.length > 20) return null;
  const out: { serviceId: string; quantity: number }[] = [];
  for (const p of parts) {
    const [serviceId, q] = p.split(":");
    const quantity = Number(q ?? "1");
    if (!serviceId || serviceId.length > 64 || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) return null;
    out.push({ serviceId, quantity });
  }
  return out;
}

const hhmm = (d: Date) => fromMinutes(minutesOfDay(d));

export async function availability(input: { regionId: string; lines: Line[]; from?: string; days?: number }, now = new Date()): Promise<Availability> {
  const teams = await eligibleTeams(input.regionId, input.lines);
  if (!teams.length) return { managed: false };
  const cfg = await loadSettings();
  const durationMin = visitMinutes(cfg, input.lines);
  const today = dayKey(now), last = addDays(today, cfg.advanceDays);
  const from = input.from && input.from > today ? input.from : today;
  const count = Math.max(1, Math.min(31, Math.floor(input.days ?? 14)));
  const dayList: string[] = [];
  for (let i = 0; i < count; i++) { const d = addDays(from, i); if (d <= last) dayList.push(d); }
  if (!dayList.length) return { managed: true, durationMin, stepMinutes: cfg.stepMinutes, holdMinutes: cfg.holdMinutes, days: [], first: null };

  const rangeStart = startOfDay(dayList[0]), rangeEnd = new Date(startOfDay(dayList[dayList.length - 1]).getTime() + DAY_MS);
  const entries = await prisma.calendarEntry.findMany({
    where: { teamId: { in: teams.map((t) => t.teamId) }, state: "ACTIVE", OR: [{ kind: { not: "HOLD" } }, { expiresAt: { gt: now } }], startsAt: { lt: new Date(rangeEnd.getTime() + DAY_MS) }, busyUntil: { gt: new Date(rangeStart.getTime() - DAY_MS) } },
    select: { teamId: true, startsAt: true, endsAt: true, busyUntil: true, kind: true },
  });

  const days: DaySlots[] = [];
  let first: { day: string; time: string } | null = null;
  for (const day of dayList) {
    const closed = closedReason(cfg, day);
    const candidates = new Map<number, boolean>();
    if (!closed) {
      for (const t of teams) {
        const busy = entries.filter((e) => e.teamId === t.teamId) as Busy[];
        for (const s of availableStarts({ day, rules: t.rules, cfg, busy: [], durationMin, now, ignoreLimits: true })) if (!candidates.has(s.getTime())) candidates.set(s.getTime(), false);
        for (const s of availableStarts({ day, rules: t.rules, cfg, busy, durationMin, now })) candidates.set(s.getTime(), true);
      }
    }
    const slots = [...candidates.entries()].sort((a, b) => a[0] - b[0]).map(([ms, ok]) => ({ time: hhmm(new Date(ms)), ok }));
    if (!first) { const s = slots.find((x) => x.ok); if (s) first = { day, time: s.time }; }
    days.push({ day, closed, slots });
  }
  return { managed: true, durationMin, stepMinutes: cfg.stepMinutes, holdMinutes: cfg.holdMinutes, days, first };
}

export type Hold = { holdKey: string; expiresAt: string; scheduledAt: string; durationMin: number };

// Keeps the chosen time for the customer for a few minutes. The team is picked here (the one with the lightest day), never shown.
export async function createHold(input: { customerId: string; regionId: string; lines: Line[]; scheduledAt: string }, now = new Date()): Promise<PublicResult<{ hold: Hold }>> {
  const start = fromLocalValue(input.scheduledAt);
  if (!start) return fail("invalid_request", "Choose a date and time.");
  const teams = await eligibleTeams(input.regionId, input.lines);
  if (!teams.length) return fail("not_managed", "Online time selection is not available for this service.");
  const cfg = await loadSettings();
  const durationMin = visitMinutes(cfg, input.lines);
  const end = new Date(start.getTime() + durationMin * MIN);

  // Lightest day first, so work spreads across the teams.
  const day = dayKey(start), dayStart = startOfDay(day), dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const loads = await prisma.calendarEntry.findMany({
    where: { teamId: { in: teams.map((t) => t.teamId) }, kind: { not: "BLOCK" }, state: "ACTIVE", OR: [{ kind: { not: "HOLD" } }, { expiresAt: { gt: now } }], startsAt: { gte: dayStart, lt: dayEnd } },
    select: { teamId: true },
  });
  const load = (id: string) => loads.filter((l) => l.teamId === id).length;
  const ordered = [...teams].sort((a, b) => load(a.teamId) - load(b.teamId) || a.teamId.localeCompare(b.teamId));

  const holdKey = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + cfg.holdMinutes * MIN);
  for (const t of ordered) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        await lock(tx, t.teamId);
        const res = await checkSlot(tx, { teamId: t.teamId, start, end }, now);
        if ("error" in res || res.problems.length) return null; // any problem (conflict, hours, notice...) means this team cannot take it
        await tx.calendarEntry.updateMany({ where: { heldByCustomerId: input.customerId, kind: "HOLD", state: "ACTIVE" }, data: { state: "CANCELLED" } }); // one hold at a time
        await tx.calendarEntry.create({
          data: { kind: "HOLD", teamId: t.teamId, startsAt: start, endsAt: end, busyUntil: new Date(end.getTime() + res.rules.travelMinutes * MIN), regionId: input.regionId, serviceId: input.lines[0].serviceId, quantity: input.lines[0].quantity, expiresAt, holdKey, heldByCustomerId: input.customerId, createdByName: "Customer" },
        });
        return true;
      });
      if (done) return { ok: true, hold: { holdKey, expiresAt: expiresAt.toISOString(), scheduledAt: input.scheduledAt, durationMin } };
    } catch (e) {
      if (!EXCLUSION.test(e instanceof Error ? e.message : String(e))) throw e; // lost a race for this team: try the next one
    }
  }
  return fail("slot_taken", "Sorry, that time was just taken. Please choose another time.");
}

export async function releaseHold(holdKey: string, customerId: string): Promise<void> {
  await prisma.calendarEntry.updateMany({ where: { holdKey, heldByCustomerId: customerId, kind: "HOLD", state: "ACTIVE" }, data: { state: "CANCELLED" } });
}

// Read-only look at a hold before the booking is priced: its time, and that it still belongs to this customer and has not run out.
export async function peekHold(holdKey: string, customerId: string, now = new Date()): Promise<PublicResult<{ start: Date; end: Date; teamId: string; regionId: string | null }>> {
  const e = await prisma.calendarEntry.findUnique({ where: { holdKey } });
  if (!e || e.kind !== "HOLD" || e.state !== "ACTIVE" || e.heldByCustomerId !== customerId || !e.expiresAt || e.expiresAt.getTime() <= now.getTime())
    return fail("hold_expired", "The time you chose is no longer held for you. Please choose a time again.");
  return { ok: true, start: e.startsAt, end: e.endsAt, teamId: e.teamId, regionId: e.regionId };
}

export type Claim = { entryId: string; teamId: string; start: Date; end: Date };

// Inside the booking's transaction: takes the hold under the team's lock, so it cannot be released or expire while the order is being created.
export async function claimHold(tx: Tx, input: { holdKey: string; customerId: string }, now = new Date()): Promise<PublicResult<{ claim: Claim }>> {
  const e = await tx.calendarEntry.findUnique({ where: { holdKey: input.holdKey } });
  if (!e || e.kind !== "HOLD" || e.heldByCustomerId !== input.customerId) return fail("hold_expired", "The time you chose is no longer held for you. Please choose a time again.");
  await lock(tx, e.teamId);
  const fresh = await tx.calendarEntry.findUnique({ where: { id: e.id } });
  if (!fresh || fresh.state !== "ACTIVE" || !fresh.expiresAt || fresh.expiresAt.getTime() <= now.getTime())
    return fail("hold_expired", "The time you chose is no longer held for you. Please choose a time again.");
  return { ok: true, claim: { entryId: fresh.id, teamId: fresh.teamId, start: fresh.startsAt, end: fresh.endsAt } };
}

// The hold becomes the order's booking on the team's calendar.
export async function attachHold(tx: Tx, claim: Claim, order: { id: string; number: string }): Promise<void> {
  await tx.calendarEntry.update({ where: { id: claim.entryId }, data: { kind: "BOOKING", orderId: order.id, expiresAt: null, holdKey: null, heldByCustomerId: null, createdByName: "Customer" } });
  await log(tx, claim.entryId, "created", { name: "Customer" }, `Booked online by the customer for order ${order.number}: ${fmt(claim.start)}–${fmt(claim.end).slice(11)}`);
}

