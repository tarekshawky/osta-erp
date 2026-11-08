import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { findOrCreateCustomer } from "@/lib/customerMatch";
import { generateOrderNumber } from "@/lib/orderData";
import { DEFAULT_SETTINGS, SettingsSchema, TeamRulesSchema, durationFor, parseBreaks, parseSettings, type CalendarConfig, type TeamRules } from "./config";
import { checkVisit, firstConflict, type Busy, type Problem } from "./engine";
import { DAY_MS, MIN, dayKey, startOfDay } from "./time";
import { calendarStatus, type CalStatus } from "./status";

// The calendar's rules for booking: every write checks the team's schedule and the existing periods inside ONE transaction that first locks
// the team's schedule row, so two requests for the same team can never both pass the check. The database constraint
// (prisma/calendar-constraints.sql) is the second, independent guard.

export type Actor = { id?: string; name: string };
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; problems?: Problem[] };
const fail = (error: string, problems?: Problem[]): { ok: false; error: string; problems?: Problem[] } => ({ ok: false, error, problems });

export const SETTINGS_ID = "default";

// ---- settings and team schedules ----

export async function loadSettings(): Promise<CalendarConfig> {
  const row = await prisma.calendarSettings.findUnique({ where: { id: SETTINGS_ID } }).catch(() => null);
  return row ? parseSettings(row.config) : DEFAULT_SETTINGS;
}

export async function saveSettings(raw: unknown, adminName: string): Promise<Result> {
  const r = SettingsSchema.safeParse(raw);
  if (!r.success) return fail(`The settings are not valid: ${r.error.issues[0]?.path.join(".") ?? ""} ${r.error.issues[0]?.message ?? ""}`.trim());
  for (const c of r.data.closures) if (c.to < c.from) return fail("A closure ends before it starts.");
  await prisma.calendarSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, config: r.data as never, updatedByName: adminName }, update: { config: r.data as never, updatedByName: adminName } });
  return { ok: true };
}

export type TeamSchedule = { teamId: string; active: boolean; regionIds: string[]; serviceIds: string[]; rules: TeamRules };
type ScheduleRow = { teamId: string; active: boolean; regionIds: string[]; serviceIds: string[]; workDays: number[]; startTime: string; endTime: string; breaks: unknown; travelMinutes: number; maxPerDay: number };
export const toSchedule = (r: ScheduleRow): TeamSchedule => ({
  teamId: r.teamId, active: r.active, regionIds: r.regionIds, serviceIds: r.serviceIds,
  rules: { workDays: r.workDays, startTime: r.startTime, endTime: r.endTime, breaks: parseBreaks(r.breaks), travelMinutes: r.travelMinutes, maxPerDay: r.maxPerDay },
});

export async function loadSchedule(teamId: string): Promise<TeamSchedule | null> {
  const r = await prisma.teamSchedule.findUnique({ where: { teamId } });
  return r ? toSchedule(r as unknown as ScheduleRow) : null;
}

export async function saveTeamSchedule(teamId: string, input: { active: boolean; regionIds: string[]; serviceIds: string[]; rules: TeamRules }): Promise<Result> {
  const rules = TeamRulesSchema.safeParse(input.rules);
  if (!rules.success) return fail("The working days, hours or breaks are not valid.");
  if ((rules.data.startTime >= rules.data.endTime)) return fail("The shift must end after it starts.");
  for (const b of rules.data.breaks) if (b.end <= b.start || b.start < rules.data.startTime || b.end > rules.data.endTime) return fail("A break must be inside the working hours and end after it starts.");
  if (!(await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } }))) return fail("Team not found.");
  const data = { active: input.active, regionIds: input.regionIds, serviceIds: input.serviceIds, workDays: rules.data.workDays, startTime: rules.data.startTime, endTime: rules.data.endTime, breaks: rules.data.breaks as never, travelMinutes: rules.data.travelMinutes, maxPerDay: rules.data.maxPerDay };
  await prisma.teamSchedule.upsert({ where: { teamId }, create: { teamId, ...data }, update: data });
  return { ok: true };
}

// ---- reading the calendar ----

export type CalendarItem = {
  id: string; kind: "BOOKING" | "BLOCK"; status: CalStatus; teamId: string; teamName: string; startsAt: string; endsAt: string; busyUntil: string;
  orderId: string | null; orderNumber: string; orderStatus: string; customerName: string; phone: string; serviceName: string; regionName: string; area: string; reason: string; notes: string; quantity: number | null;
};

type EntryRow = {
  id: string; kind: string; state: string; override: boolean; teamId: string; startsAt: Date; endsAt: Date; busyUntil: Date; orderId: string | null; reason: string; notes: string; area: string; quantity: number | null; serviceId: string | null; regionId: string | null;
  team?: { name: string } | null; order?: { number: string; status: string; customer?: { name: string; phone: string } | null; bookableService?: { nameEn: string } | null; region?: { nameEn: string } | null } | null;
};

export async function listItems(input: { from: Date; to: Date; teamId?: string; regionId?: string }): Promise<CalendarItem[]> {
  const rows = (await prisma.calendarEntry.findMany({
    where: { startsAt: { lt: input.to }, endsAt: { gt: input.from }, ...(input.teamId ? { teamId: input.teamId } : {}), ...(input.regionId ? { OR: [{ regionId: input.regionId }, { kind: "BLOCK" }] } : {}) },
    orderBy: { startsAt: "asc" },
    include: { team: { select: { name: true } }, order: { select: { number: true, status: true, customer: { select: { name: true, phone: true } }, bookableService: { select: { nameEn: true } }, region: { select: { nameEn: true } } } } },
  })) as unknown as EntryRow[];
  return rows.map((r) => ({
    id: r.id, kind: r.kind as "BOOKING" | "BLOCK", status: calendarStatus(r), teamId: r.teamId, teamName: r.team?.name ?? "", startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), busyUntil: r.busyUntil.toISOString(),
    orderId: r.orderId, orderNumber: r.order?.number ?? "", orderStatus: r.order?.status ?? "", customerName: r.order?.customer?.name ?? "", phone: r.order?.customer?.phone ?? "",
    serviceName: r.order?.bookableService?.nameEn ?? "", regionName: r.order?.region?.nameEn ?? "", area: r.area, reason: r.reason, notes: r.notes, quantity: r.quantity,
  }));
}

// ---- the checked write ----

const EXCLUSION = /exclusion constraint|23P01|CalendarEntry_no_overlap/i;
type Tx = Prisma.TransactionClient;

async function busyOf(tx: Tx, teamId: string, start: Date, excludeId?: string): Promise<Busy[]> {
  const day = startOfDay(dayKey(start));
  const rows = await tx.calendarEntry.findMany({
    where: { teamId, state: "ACTIVE", startsAt: { lt: new Date(day.getTime() + 2 * DAY_MS) }, busyUntil: { gt: new Date(day.getTime() - DAY_MS) }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { startsAt: true, endsAt: true, busyUntil: true, kind: true },
  });
  return rows as Busy[];
}

export type Slot = { teamId: string; start: Date; end: Date; excludeEntryId?: string; ignoreLimits?: boolean; override?: boolean };

// Checks a visit against the team's schedule and bookings inside the caller's transaction (which has locked the team).
export async function checkSlot(tx: Tx, slot: Slot, now = new Date()): Promise<{ problems: Problem[]; rules: TeamRules; schedule: TeamSchedule } | { error: string }> {
  const sched = await tx.teamSchedule.findUnique({ where: { teamId: slot.teamId } });
  if (!sched || !sched.active) return { error: "This team is not managed by the calendar. Set up its schedule first." };
  const schedule = toSchedule(sched as unknown as ScheduleRow);
  const cfg = await tx.calendarSettings.findUnique({ where: { id: SETTINGS_ID } }).then((r) => (r ? parseSettings(r.config) : DEFAULT_SETTINGS));
  if (!(slot.end.getTime() > slot.start.getTime())) return { error: "The end of the visit must be after its start." };
  const busy = await busyOf(tx, slot.teamId, slot.start, slot.excludeEntryId);
  const problems = checkVisit({ rules: schedule.rules, cfg, busy, start: slot.start, end: slot.end, now, ignoreLimits: slot.ignoreLimits });
  return { problems, rules: schedule.rules, schedule };
}

// Only an authorised override may ignore a conflict; every other rule is for the customer channel (ignoreLimits relaxes those for the team).
const HARD = new Set(["conflict"]);
export const describe = (p: Problem[]) => p.map((x) => x.message).join(" ");

async function lock(tx: Tx, teamId: string) {
  await tx.$queryRaw`SELECT "teamId" FROM "TeamSchedule" WHERE "teamId" = ${teamId} FOR UPDATE`;
}

async function log(tx: Tx, entryId: string, action: string, actor: Actor, detail = "") {
  await tx.calendarEvent.create({ data: { entryId, action, actorName: actor.name, detail } });
}

const fmt = (d: Date) => new Date(d.getTime() + 4 * 60 * MIN).toISOString().slice(0, 16).replace("T", " ");

// ---- orders and the calendar ----

type OrderForSync = { id: string; number: string; teamId: string | null; scheduledAt: Date | null; status: string; bookableServiceId: string | null; quantity: number | null; regionId: string | null; locationUrl: string | null };

// Would this order's team and time clash with the team's calendar? Used before an order is saved so a double booking is refused up front.
export async function checkOrderSlot(input: { orderId?: string; teamId: string | null; scheduledAt: Date | null; bookableServiceId?: string | null; quantity?: number | null }): Promise<Result<{ managed: boolean }>> {
  if (!input.teamId || !input.scheduledAt) return { ok: true, managed: false };
  const sched = await prisma.teamSchedule.findUnique({ where: { teamId: input.teamId } });
  if (!sched || !sched.active) return { ok: true, managed: false };
  const cfg = await loadSettings();
  const existing = input.orderId ? await prisma.calendarEntry.findUnique({ where: { orderId: input.orderId } }) : null;
  const minutes = existing && existing.state === "ACTIVE" ? Math.round((existing.endsAt.getTime() - existing.startsAt.getTime()) / MIN) : durationFor(cfg, input.bookableServiceId, input.quantity);
  const end = new Date(input.scheduledAt.getTime() + minutes * MIN);
  const res = await prisma.$transaction(async (tx) => checkSlot(tx, { teamId: input.teamId!, start: input.scheduledAt!, end, excludeEntryId: existing?.id, ignoreLimits: true }));
  if ("error" in res) return fail(res.error);
  const hard = res.problems.filter((p) => HARD.has(p.code));
  return hard.length ? fail(`${describe(hard)} Choose another time or team, or use the calendar to book past the conflict.`, hard) : { ok: true, managed: true };
}

// Makes the calendar match an order: creates, moves or cancels its booking. Orders of teams the calendar does not manage are left alone.
export async function syncOrder(orderId: string, actor: Actor, opts: { override?: boolean } = {}): Promise<Result<{ entryId: string | null }>> {
  const order = (await prisma.order.findUnique({ where: { id: orderId } })) as unknown as OrderForSync | null;
  if (!order) return fail("Order not found.");
  const entry = await prisma.calendarEntry.findUnique({ where: { orderId } });

  // A cancelled order frees its time.
  if (order.status === "Cancelled") {
    if (entry && entry.state === "ACTIVE") {
      await prisma.$transaction(async (tx) => { await tx.calendarEntry.update({ where: { id: entry.id }, data: { state: "CANCELLED" } }); await log(tx, entry.id, "cancelled", actor, `Order ${order.number} was cancelled: the time is free again`); });
    }
    return { ok: true, entryId: entry?.id ?? null };
  }
  if (!order.teamId || !order.scheduledAt) {
    // Taken off the calendar (no team or no time any more).
    if (entry && entry.state === "ACTIVE") await prisma.$transaction(async (tx) => { await tx.calendarEntry.update({ where: { id: entry.id }, data: { state: "CANCELLED" } }); await log(tx, entry.id, "removed", actor, "The order no longer has a team and a time"); });
    return { ok: true, entryId: entry?.id ?? null };
  }
  const managed = await prisma.teamSchedule.findUnique({ where: { teamId: order.teamId }, select: { active: true } });
  if (!managed?.active) {
    if (entry && entry.state === "ACTIVE") await prisma.$transaction(async (tx) => { await tx.calendarEntry.update({ where: { id: entry.id }, data: { state: "CANCELLED" } }); await log(tx, entry.id, "removed", actor, "The order moved to a team the calendar does not manage"); });
    return { ok: true, entryId: entry?.id ?? null };
  }

  const cfg = await loadSettings();
  const minutes = entry && entry.state === "ACTIVE" ? Math.round((entry.endsAt.getTime() - entry.startsAt.getTime()) / MIN) : durationFor(cfg, order.bookableServiceId, order.quantity);
  const start = order.scheduledAt, end = new Date(start.getTime() + minutes * MIN);
  if (entry && entry.state === "ACTIVE" && entry.teamId === order.teamId && entry.startsAt.getTime() === start.getTime() && entry.endsAt.getTime() === end.getTime()) return { ok: true, entryId: entry.id };

  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx, order.teamId!);
      const res = await checkSlot(tx, { teamId: order.teamId!, start, end, excludeEntryId: entry?.id, ignoreLimits: true });
      if ("error" in res) return fail(res.error);
      const conflict = res.problems.some((p) => HARD.has(p.code));
      if (conflict && !opts.override) return fail(`${describe(res.problems.filter((p) => HARD.has(p.code)))} The order was not moved on the calendar.`, res.problems);
      const busyUntil = new Date(end.getTime() + res.rules.travelMinutes * MIN);
      const data = { teamId: order.teamId!, startsAt: start, endsAt: end, busyUntil, state: "ACTIVE", override: conflict, serviceId: order.bookableServiceId, regionId: order.regionId, quantity: order.quantity };
      if (entry) {
        const moved = entry.state === "CANCELLED" ? "restored" : entry.teamId !== order.teamId ? "reassigned" : "moved";
        await tx.calendarEntry.update({ where: { id: entry.id }, data });
        await log(tx, entry.id, moved, actor, `${moved === "reassigned" ? "Team changed. " : ""}${fmt(entry.startsAt)} → ${fmt(start)} (${order.number})${conflict ? " — booked past a conflict" : ""}`);
        return { ok: true as const, entryId: entry.id };
      }
      const created = await tx.calendarEntry.create({ data: { ...data, kind: "BOOKING", orderId: order.id, createdByName: actor.name } });
      await log(tx, created.id, "created", actor, `Booked for order ${order.number}: ${fmt(start)}–${fmt(end).slice(11)}${conflict ? " — past a conflict" : ""}`);
      return { ok: true as const, entryId: created.id };
    });
  } catch (e) {
    if (EXCLUSION.test(e instanceof Error ? e.message : String(e))) return fail("Another booking was just made for this team at that time. Choose another time.");
    throw e;
  }
}

// ---- manual bookings and blocks from the calendar ----

// "Auto" team: the first managed team that covers the emirate and the service and is free for the whole visit. A team with an empty emirate
// or service list covers all of them. A team that is free and inside its working hours is preferred over one that is only free.
export async function pickTeam(input: { regionId: string; serviceId: string; start: Date; end: Date }): Promise<string | null> {
  const schedules = await prisma.teamSchedule.findMany({ where: { active: true } });
  let fallback: string | null = null;
  for (const s of schedules as unknown as ScheduleRow[]) {
    if (s.regionIds.length && !s.regionIds.includes(input.regionId)) continue;
    if (s.serviceIds.length && !s.serviceIds.includes(input.serviceId)) continue;
    const res = await prisma.$transaction(async (tx) => checkSlot(tx, { teamId: s.teamId, start: input.start, end: input.end, ignoreLimits: true }));
    if ("error" in res || res.problems.some((p) => HARD.has(p.code))) continue;
    if (!res.problems.length) return s.teamId;
    fallback ??= s.teamId;
  }
  return fallback;
}

export type BookingInput = {
  teamId: string; start: Date; end: Date; customerName: string; phone: string; regionId: string; area: string; serviceId: string; quantity: number; notes: string; employeeId: string | null; override?: boolean;
};

export async function addBooking(input: BookingInput, actor: Actor): Promise<Result<{ orderId: string; orderNumber: string; entryId: string }>> {
  if (input.customerName.trim().length < 2 || input.phone.replace(/\D/g, "").length < 7) return fail("Enter the customer's name and phone number.");
  const [team, region, service] = await Promise.all([
    prisma.team.findUnique({ where: { id: input.teamId }, select: { id: true, name: true } }),
    prisma.region.findUnique({ where: { id: input.regionId }, select: { id: true, nameEn: true } }),
    prisma.bookableService.findUnique({ where: { id: input.serviceId }, select: { id: true } }),
  ]);
  if (!team) return fail("Choose a team.");
  if (!region) return fail("Choose the emirate.");
  if (!service) return fail("Choose the service.");
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  // Refuse a clash before anything is created, so a refused booking leaves no customer record behind (the transaction below is the real guard).
  const early = await prisma.$transaction(async (tx) => checkSlot(tx, { teamId: input.teamId, start: input.start, end: input.end, ignoreLimits: true }));
  if ("error" in early) return fail(early.error);
  const clash = early.problems.filter((p) => HARD.has(p.code));
  if (clash.length && !input.override) return fail(describe(clash), early.problems);
  const customer = await findOrCreateCustomer({ type: "INDIVIDUAL", name: input.customerName, phone: input.phone, whatsapp: null, emirate: region.nameEn, leadSource: "Phone" }, actor.id ?? "");
  const number = await generateOrderNumber();
  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx, input.teamId);
      const res = await checkSlot(tx, { teamId: input.teamId, start: input.start, end: input.end, ignoreLimits: true });
      if ("error" in res) return fail(res.error);
      const conflict = res.problems.some((p) => HARD.has(p.code));
      if (conflict && !input.override) return fail(describe(res.problems.filter((p) => HARD.has(p.code))), res.problems);
      const order = await tx.order.create({
        data: {
          number, date: new Date(), scheduledAt: input.start, customerId: customer.id, orderType: "New Order", priceAgreed: "No", customerLanguage: "Arabic", leadSource: "Phone", notes: input.notes.trim() || null,
          status: input.employeeId ? "Assigned" : "Requested", teamId: input.teamId, assignedToId: input.employeeId, createdById: actor.id ?? null, regionId: input.regionId, bookableServiceId: input.serviceId, quantity,
        },
      });
      const busyUntil = new Date(input.end.getTime() + res.rules.travelMinutes * MIN);
      const entry = await tx.calendarEntry.create({ data: { kind: "BOOKING", teamId: input.teamId, orderId: order.id, startsAt: input.start, endsAt: input.end, busyUntil, override: conflict, regionId: input.regionId, serviceId: input.serviceId, quantity, area: input.area.trim(), notes: input.notes.trim(), createdByName: actor.name } });
      await log(tx, entry.id, "created", actor, `Booked by the office for ${input.customerName.trim()}: ${fmt(input.start)}–${fmt(input.end).slice(11)}${conflict ? " — past a conflict (authorised override)" : ""}`);
      return { ok: true as const, orderId: order.id, orderNumber: order.number, entryId: entry.id };
    });
  } catch (e) {
    if (EXCLUSION.test(e instanceof Error ? e.message : String(e))) return fail("Another booking was just made for this team at that time. Choose another time.");
    throw e;
  }
}

export async function addBlock(input: { teamId: string; start: Date; end: Date; reason: string; override?: boolean }, actor: Actor): Promise<Result<{ entryId: string }>> {
  if (!(input.end.getTime() > input.start.getTime())) return fail("The end must be after the start.");
  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx, input.teamId);
      const sched = await tx.teamSchedule.findUnique({ where: { teamId: input.teamId } });
      if (!sched || !sched.active) return fail("This team is not managed by the calendar. Set up its schedule first.");
      const busy = await busyOf(tx, input.teamId, input.start);
      const clash = firstConflict(busy, input.start, input.end, 0);
      if (clash && !input.override) return fail(clash.kind === "BLOCK" ? "That time is already blocked." : "The team has a booking in that period. Move or cancel it first, or block another time.");
      const e = await tx.calendarEntry.create({ data: { kind: "BLOCK", teamId: input.teamId, startsAt: input.start, endsAt: input.end, busyUntil: input.end, reason: input.reason.trim(), override: !!clash, createdByName: actor.name } });
      await log(tx, e.id, "blocked", actor, `${fmt(input.start)}–${fmt(input.end)}${input.reason.trim() ? `: ${input.reason.trim()}` : ""}`);
      return { ok: true as const, entryId: e.id };
    });
  } catch (err) {
    if (EXCLUSION.test(err instanceof Error ? err.message : String(err))) return fail("That time was just taken. Choose another.");
    throw err;
  }
}

export async function removeBlock(entryId: string, actor: Actor): Promise<Result> {
  const e = await prisma.calendarEntry.findUnique({ where: { id: entryId } });
  if (!e || e.kind !== "BLOCK") return fail("Block not found.");
  await prisma.$transaction(async (tx) => { await tx.calendarEntry.update({ where: { id: e.id }, data: { state: "CANCELLED" } }); await log(tx, e.id, "unblocked", actor, "The block was removed"); });
  return { ok: true };
}

// Drag and drop / edit: moves a booking (or block) to another time and/or team. A booking's order follows (its time and team).
export async function moveEntry(entryId: string, to: { teamId?: string; start: Date; end?: Date }, actor: Actor, opts: { override?: boolean } = {}): Promise<Result> {
  const entry = await prisma.calendarEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.state !== "ACTIVE") return fail("Booking not found.");
  const teamId = to.teamId ?? entry.teamId;
  const minutes = Math.round((entry.endsAt.getTime() - entry.startsAt.getTime()) / MIN);
  const start = to.start, end = to.end ?? new Date(start.getTime() + minutes * MIN);
  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx, teamId);
      const res = await checkSlot(tx, { teamId, start, end, excludeEntryId: entry.id, ignoreLimits: true });
      if ("error" in res) return fail(res.error);
      const conflict = res.problems.some((p) => HARD.has(p.code));
      if (conflict && !opts.override) return fail(describe(res.problems.filter((p) => HARD.has(p.code))), res.problems);
      const travel = entry.kind === "BLOCK" ? 0 : res.rules.travelMinutes;
      const changedTeam = teamId !== entry.teamId;
      await tx.calendarEntry.update({ where: { id: entry.id }, data: { teamId, startsAt: start, endsAt: end, busyUntil: new Date(end.getTime() + travel * MIN), override: conflict } });
      if (entry.orderId) {
        const order = await tx.order.findUnique({ where: { id: entry.orderId }, select: { status: true, scheduledAt: true, number: true } });
        await tx.order.update({ where: { id: entry.orderId }, data: { scheduledAt: start, teamId, rescheduledAt: new Date() } });
        if (actor.id && order) await tx.orderStatusChange.create({ data: { orderId: entry.orderId, previousStatus: order.status, newStatus: order.status, reason: changedTeam ? "Moved in the calendar (team changed)" : "Moved in the calendar", previousScheduledAt: order.scheduledAt, newScheduledAt: start, changedById: actor.id } });
      }
      await log(tx, entry.id, changedTeam ? "reassigned" : "moved", actor, `${fmt(entry.startsAt)} → ${fmt(start)}${changedTeam ? " (new team)" : ""}${conflict ? " — past a conflict (authorised override)" : ""}`);
      return { ok: true as const };
    });
  } catch (e) {
    if (EXCLUSION.test(e instanceof Error ? e.message : String(e))) return fail("Another booking was just made for this team at that time. Choose another time.");
    throw e;
  }
}

export async function entryHistory(entryId: string): Promise<{ action: string; actorName: string; detail: string; at: string }[]> {
  const rows = await prisma.calendarEvent.findMany({ where: { entryId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ action: r.action, actorName: r.actorName, detail: r.detail, at: r.createdAt.toISOString() }));
}

// One-time: gives every existing order of a managed team (with a team, a time and not cancelled) its calendar period. Orders that already clash are
// kept and shown as conflicts instead of being dropped.
export async function syncExistingOrders(actor: Actor): Promise<{ created: number; conflicts: number; skipped: number }> {
  const managed = await prisma.teamSchedule.findMany({ where: { active: true }, select: { teamId: true } });
  if (!managed.length) return { created: 0, conflicts: 0, skipped: 0 };
  const orders = await prisma.order.findMany({
    where: { teamId: { in: managed.map((m) => m.teamId) }, scheduledAt: { not: null }, status: { not: "Cancelled" }, calendarEntry: null },
    orderBy: { scheduledAt: "asc" }, select: { id: true },
  });
  let created = 0, conflicts = 0, skipped = 0;
  for (const o of orders) {
    const r = await syncOrder(o.id, actor);
    if (r.ok) { created++; continue; }
    const forced = await syncOrder(o.id, actor, { override: true });
    if (forced.ok) { created++; conflicts++; } else skipped++;
  }
  return { created, conflicts, skipped };
}
