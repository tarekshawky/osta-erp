"use server";

import { revalidatePath } from "next/cache";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import * as cal from "@/lib/calendar/service";
import { fromLocalValue } from "@/lib/calendar/time";
import type { TeamRules } from "@/lib/calendar/config";

// Every calendar change checks the administrator's permission on the server (calendar.manage, plus calendar.override to book past a conflict),
// goes through the same checked write as the order screens, and is written to the audit trail. The rules live in lib/calendar.

export type CalResult = { ok: boolean; error?: string; conflict?: boolean; orderId?: string; orderNumber?: string; history?: { action: string; actorName: string; detail: string; at: string }[]; created?: number; conflicts?: number; skipped?: number };
const fail = (error: string, conflict = false): CalResult => ({ ok: false, error, conflict });
const failFrom = (r: { error: string; problems?: { code: string }[] }): CalResult => fail(r.error, !!r.problems?.some((p) => p.code === "conflict"));
const refresh = () => { revalidatePath("/admin/calendar"); revalidatePath("/admin/orders"); };

type Guarded = { error: string } | { admin: { id: string; name: string }; actor: { id: string; name: string } };
async function guard(wantOverride = false): Promise<Guarded> {
  const g = await guardPermission("calendar.manage");
  if (!g.ok) return { error: g.error };
  if (wantOverride && !g.can("calendar.override")) return { error: "You don't have permission to book past a conflict. Ask the owner to update your role." };
  return { admin: g.admin, actor: { id: g.admin.id, name: g.admin.name } };
}

const text = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function addBookingAction(raw: Record<string, unknown>): Promise<CalResult> {
  const override = raw.override === true;
  const g = await guard(override);
  if ("error" in g) return fail(g.error);
  const start = fromLocalValue(text(raw.start)), end = fromLocalValue(text(raw.end));
  if (!start || !end) return fail("Choose the date and the start and end time.");
  let teamId = text(raw.teamId);
  if (teamId === "auto") {
    const picked = await cal.pickTeam({ regionId: text(raw.regionId), serviceId: text(raw.serviceId), start, end });
    if (!picked) return fail("No team covering this emirate and service is free at that time. Choose another time or pick a team.");
    teamId = picked;
  }
  const r = await cal.addBooking({
    teamId, start, end, customerName: text(raw.customerName, 120), phone: text(raw.phone, 40), regionId: text(raw.regionId), area: text(raw.area, 160),
    serviceId: text(raw.serviceId), quantity: Number(raw.quantity) || 1, notes: text(raw.notes, 1000), employeeId: text(raw.employeeId) || null, override,
  }, g.actor);
  if (!r.ok) return failFrom(r);
  await writeAudit(g.admin, "calendar.booking.create", "Order", r.orderId, null, { number: r.orderNumber, teamId: raw.teamId, start: raw.start, end: raw.end, override });
  refresh();
  return { ok: true, orderId: r.orderId, orderNumber: r.orderNumber };
}

export async function addBlockAction(raw: Record<string, unknown>): Promise<CalResult> {
  const override = raw.override === true;
  const g = await guard(override);
  if ("error" in g) return fail(g.error);
  const start = fromLocalValue(text(raw.start)), end = fromLocalValue(text(raw.end));
  if (!start || !end) return fail("Choose the start and end of the blocked time.");
  const r = await cal.addBlock({ teamId: text(raw.teamId), start, end, reason: text(raw.reason, 200), override }, g.actor);
  if (!r.ok) return failFrom(r);
  await writeAudit(g.admin, "calendar.block.create", "CalendarEntry", r.entryId, null, { teamId: raw.teamId, start: raw.start, end: raw.end, reason: raw.reason });
  refresh();
  return { ok: true };
}

export async function removeBlockAction(entryId: string): Promise<CalResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await cal.removeBlock(entryId, g.actor);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "calendar.block.remove", "CalendarEntry", entryId, null, null);
  refresh();
  return { ok: true };
}

// Drag and drop or the details panel: a new start (UAE "YYYY-MM-DDTHH:mm"), optionally a new end and/or team.
export async function moveEntryAction(entryId: string, raw: { start: string; end?: string; teamId?: string; override?: boolean }): Promise<CalResult> {
  const override = raw.override === true;
  const g = await guard(override);
  if ("error" in g) return fail(g.error);
  const start = fromLocalValue(text(raw.start));
  const end = raw.end ? fromLocalValue(text(raw.end)) : undefined;
  if (!start || (raw.end && !end)) return fail("Choose a valid date and time.");
  const r = await cal.moveEntry(entryId, { start, end: end ?? undefined, teamId: raw.teamId || undefined }, g.actor, { override });
  if (!r.ok) return failFrom(r);
  await writeAudit(g.admin, "calendar.move", "CalendarEntry", entryId, null, { start: raw.start, end: raw.end, teamId: raw.teamId, override });
  refresh();
  return { ok: true };
}

export async function historyAction(entryId: string): Promise<CalResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  return { ok: true, history: await cal.entryHistory(entryId) };
}

export async function saveTeamScheduleAction(teamId: string, input: { active: boolean; regionIds: string[]; serviceIds: string[]; rules: TeamRules }): Promise<CalResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await cal.saveTeamSchedule(teamId, input);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "calendar.schedule.save", "TeamSchedule", teamId, null, input);
  revalidatePath("/admin/calendar", "layout");
  return { ok: true };
}

export async function saveSettingsAction(config: unknown): Promise<CalResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await cal.saveSettings(config, g.admin.name);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "calendar.settings.save", "CalendarSettings", cal.SETTINGS_ID, null, config);
  revalidatePath("/admin/calendar", "layout");
  return { ok: true };
}

export async function syncExistingOrdersAction(): Promise<CalResult> {
  const g = await guard(true);
  if ("error" in g) return fail(g.error);
  const r = await cal.syncExistingOrders(g.actor);
  await writeAudit(g.admin, "calendar.sync-orders", "CalendarEntry", null, null, r);
  refresh();
  return { ok: true, ...r };
}
