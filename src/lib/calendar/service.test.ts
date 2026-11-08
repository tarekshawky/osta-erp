import { describe, it, expect, vi, beforeEach } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;
const mem = vi.hoisted(() => ({ schedules: [] as R[], entries: [] as R[], events: [] as R[], orders: [] as R[], customers: [] as R[], changes: [] as R[], settings: null as R | null, seq: 0, raceOnce: false }));

vi.mock("@/lib/prisma", () => {
  const overlap = (a: R, b: R) => a.startsAt < b.busyUntil && b.startsAt < a.busyUntil;
  const entryWhere = (e: R, w: R): boolean => Object.entries(w).every(([k, v]) => {
    if (k === "startsAt" && v && typeof v === "object" && "lt" in (v as object)) return e.startsAt < (v as R).lt;
    if (k === "endsAt" && v && typeof v === "object" && "gt" in (v as object)) return e.endsAt > (v as R).gt;
    if (k === "busyUntil" && v && typeof v === "object" && "gt" in (v as object)) return e.busyUntil > (v as R).gt;
    if (k === "id" && v && typeof v === "object" && "not" in (v as object)) return e.id !== (v as R).not;
    if (k === "OR") return true;
    return e[k] === v;
  });
  const db: R = {
    team: { findUnique: async ({ where }: R) => (where.id === "t1" || where.id === "t2" ? { id: where.id, name: where.id === "t1" ? "Ajman Team 1" : "Ajman Team 2" } : null) },
    region: { findUnique: async ({ where }: R) => (where.id === "r1" ? { id: "r1", nameEn: "Ajman" } : null) },
    bookableService: { findUnique: async ({ where }: R) => (where.id === "s1" ? { id: "s1" } : null) },
    teamSchedule: {
      findUnique: async ({ where }: R) => mem.schedules.find((s) => s.teamId === where.teamId) ?? null,
      findMany: async ({ where }: R) => mem.schedules.filter((s) => (where?.active === undefined || s.active === where.active)),
      upsert: async ({ where, create, update }: R) => { const i = mem.schedules.findIndex((s) => s.teamId === where.teamId); if (i >= 0) Object.assign(mem.schedules[i], update); else mem.schedules.push({ ...create }); return {}; },
    },
    calendarSettings: { findUnique: async () => mem.settings, upsert: async ({ create, update }: R) => { mem.settings = mem.settings ? { ...mem.settings, ...update } : create; return mem.settings; } },
    calendarEntry: {
      findUnique: async ({ where }: R) => mem.entries.find((e) => (where.id ? e.id === where.id : e.orderId === where.orderId)) ?? null,
      findMany: async ({ where }: R) => { if (mem.raceOnce) { mem.raceOnce = false; return []; } return mem.entries.filter((e) => entryWhere(e, where)); },
      create: async ({ data }: R) => {
        // The database's own protection: an active, non-override period may not overlap another of the same team.
        if (data.state !== "CANCELLED" && !data.override && mem.entries.some((e) => e.teamId === data.teamId && e.state === "ACTIVE" && !e.override && overlap(e, data))) throw new Error('conflicting key value violates exclusion constraint "CalendarEntry_no_overlap"');
        const e = { id: `e${++mem.seq}`, state: "ACTIVE", override: false, reason: "", notes: "", area: "", quantity: null, orderId: null, ...data }; mem.entries.push(e); return e;
      },
      update: async ({ where, data }: R) => {
        const e = mem.entries.find((x) => x.id === where.id)!; const next = { ...e, ...data };
        if (next.state === "ACTIVE" && !next.override && mem.entries.some((o) => o.id !== e.id && o.teamId === next.teamId && o.state === "ACTIVE" && !o.override && overlap(o, next))) throw new Error("violates exclusion constraint");
        Object.assign(e, data); return e;
      },
    },
    calendarEvent: { create: async ({ data }: R) => { mem.events.push({ ...data, createdAt: new Date() }); return data; }, findMany: async ({ where }: R) => mem.events.filter((e) => e.entryId === where.entryId) },
    order: {
      findUnique: async ({ where }: R) => { const o = mem.orders.find((x) => x.id === where.id); return o ? { ...o } : null; },
      findMany: async ({ where }: R) => mem.orders.filter((o) => (!where.teamId || where.teamId.in.includes(o.teamId)) && o.scheduledAt && o.status !== "Cancelled" && !mem.entries.some((e) => e.orderId === o.id)),
      create: async ({ data }: R) => { const o = { id: `o${++mem.seq}`, ...data }; mem.orders.push(o); return o; },
      update: async ({ where, data }: R) => { const o = mem.orders.find((x) => x.id === where.id)!; Object.assign(o, data); return o; },
    },
    orderStatusChange: { create: async ({ data }: R) => { mem.changes.push(data); return data; } },
    $queryRaw: async () => [],
  };
  db.$transaction = async (cb: (tx: unknown) => unknown) => cb(db);
  return { prisma: db };
});
// The real function needs an emirate for a new customer; the mock enforces the same so a missing one cannot slip through.
vi.mock("@/lib/customerMatch", () => ({ findOrCreateCustomer: async (i: R) => { if (!i.emirate) throw new Error("emirate is required"); mem.customers.push(i); return { id: "c1" }; } }));
vi.mock("@/lib/orderData", () => ({ generateOrderNumber: async () => `ORD-2026-00000${mem.seq + 1}` }));

import * as cal from "./service";
import { at } from "./time";
import { DEFAULT_SETTINGS } from "./config";

const actor = { id: "a1", name: "Layla" };
const DAY = "2099-03-10"; // far in the future so customer limits never interfere
const sched = (teamId: string, over: R = {}) => ({ teamId, active: true, regionIds: ["r1"], serviceIds: [], workDays: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "18:00", breaks: [], travelMinutes: 30, maxPerDay: 0, ...over });
const order = (id: string, teamId: string | null, h: number, over: R = {}) => { const o = { id, number: id.toUpperCase(), teamId, scheduledAt: teamId ? at(DAY, h * 60) : null, status: "Assigned", bookableServiceId: null, quantity: null, regionId: "r1", locationUrl: null, ...over }; mem.orders.push(o); return o; };
const active = () => mem.entries.filter((e) => e.state === "ACTIVE");

beforeEach(() => { for (const k of ["schedules", "entries", "events", "orders", "customers", "changes"] as const) mem[k] = []; mem.settings = null; mem.seq = 0; mem.schedules.push(sched("t1"), sched("t2")); });

describe("team schedules", () => {
  it("saves a valid schedule and refuses a bad one", async () => {
    const rules = { workDays: [1, 2], startTime: "09:00", endTime: "17:00", breaks: [{ start: "12:00", end: "13:00" }], travelMinutes: 20, maxPerDay: 4 };
    expect(await cal.saveTeamSchedule("t1", { active: true, regionIds: ["r1"], serviceIds: [], rules })).toMatchObject({ ok: true }); expect((await cal.loadSchedule("t1"))?.rules.startTime).toBe("09:00");
    for (const bad of [{ ...rules, endTime: "08:00" }, { ...rules, breaks: [{ start: "07:00", end: "08:00" }] }, { ...rules, workDays: [9] }, { ...rules, travelMinutes: -5 }]) expect((await cal.saveTeamSchedule("t1", { active: true, regionIds: [], serviceIds: [], rules: bad as never })).ok).toBe(false);
    expect((await cal.saveTeamSchedule("nope", { active: true, regionIds: [], serviceIds: [], rules })).ok).toBe(false);
  });
  it("saves settings, with holidays and service durations", async () => {
    expect(await cal.saveSettings({ ...DEFAULT_SETTINGS, holidays: [{ date: "2099-12-02", name: "National Day" }], services: { s1: { minutes: 90, perUnit: 15 } } }, "A")).toMatchObject({ ok: true });
    expect((await cal.loadSettings()).services.s1).toEqual({ minutes: 90, perUnit: 15 }); expect((await cal.saveSettings({ ...DEFAULT_SETTINGS, advanceDays: 0 }, "A")).ok).toBe(false);
    expect((await cal.saveSettings({ ...DEFAULT_SETTINGS, closures: [{ from: "2099-02-02", to: "2099-02-01", reason: "x" }] }, "A")).ok).toBe(false);
  });
});

describe("orders and the calendar stay in step", () => {
  it("an order with a team and a time becomes one booking on the team's calendar (default duration), once", async () => {
    order("o1", "t1", 10);
    const r = await cal.syncOrder("o1", actor); expect(r).toMatchObject({ ok: true, entryId: expect.any(String) });
    expect(active()).toHaveLength(1); expect(active()[0]).toMatchObject({ teamId: "t1", orderId: "o1", kind: "BOOKING" });
    expect((active()[0].endsAt.getTime() - active()[0].startsAt.getTime()) / 60000).toBe(60); expect((active()[0].busyUntil.getTime() - active()[0].endsAt.getTime()) / 60000).toBe(30);
    await cal.syncOrder("o1", actor); await cal.syncOrder("o1", actor); expect(mem.entries).toHaveLength(1); // never duplicated
  });
  it("uses the service's duration and quantity", async () => {
    await cal.saveSettings({ ...DEFAULT_SETTINGS, services: { s1: { minutes: 60, perUnit: 30 } } }, "A");
    order("o1", "t1", 10, { bookableServiceId: "s1", quantity: 3 }); await cal.syncOrder("o1", actor);
    expect((active()[0].endsAt.getTime() - active()[0].startsAt.getTime()) / 60000).toBe(120);
  });
  it("a team the calendar does not manage is left alone", async () => {
    mem.schedules = [sched("t1", { active: false })]; order("o1", "t1", 10); order("o2", "t9", 10);
    expect(await cal.syncOrder("o1", actor)).toMatchObject({ ok: true, entryId: null }); expect(await cal.syncOrder("o2", actor)).toMatchObject({ ok: true, entryId: null }); expect(mem.entries).toHaveLength(0);
    expect(await cal.checkOrderSlot({ teamId: "t9", scheduledAt: at(DAY, 600) })).toMatchObject({ ok: true, managed: false });
  });
  it("changing the time moves the booking; changing the team moves it to the other team's calendar; both are in the history", async () => {
    const o = order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    o.scheduledAt = at(DAY, 14 * 60); await cal.syncOrder("o1", actor); expect(active()[0].startsAt).toEqual(at(DAY, 14 * 60));
    o.teamId = "t2"; await cal.syncOrder("o1", actor); expect(active()[0].teamId).toBe("t2"); expect(mem.entries).toHaveLength(1);
    expect(mem.events.map((e) => e.action)).toEqual(["created", "moved", "reassigned"]);
  });
  it("cancelling the order frees the time for others; reinstating it books it again", async () => {
    const o = order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    o.status = "Cancelled"; await cal.syncOrder("o1", actor); expect(active()).toHaveLength(0);
    order("o2", "t1", 10); expect(await cal.syncOrder("o2", actor)).toMatchObject({ ok: true }); expect(active()).toHaveLength(1);
    o.status = "Assigned"; expect((await cal.syncOrder("o1", actor)).ok).toBe(false); // the time was taken meanwhile
  });
  it("an order that loses its team or time leaves the calendar", async () => {
    const o = order("o1", "t1", 10); await cal.syncOrder("o1", actor); o.teamId = null; await cal.syncOrder("o1", actor); expect(active()).toHaveLength(0);
  });
});

describe("double booking is refused", () => {
  it("a second order for the same team and time is refused with a clear reason, even in the travel gap", async () => {
    order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    order("o2", "t1", 10); const same = await cal.syncOrder("o2", actor); expect(same.ok).toBe(false); expect(!same.ok && same.error).toMatch(/already has a booking/);
    order("o3", "t1", 11, { scheduledAt: at(DAY, 11 * 60 + 15) }); expect((await cal.syncOrder("o3", actor)).ok).toBe(false); // 11:15 is inside 11:00-11:30 travel
    order("o4", "t1", 12, { scheduledAt: at(DAY, 11 * 60 + 30) }); expect((await cal.syncOrder("o4", actor)).ok).toBe(true); // 11:30 is free
    expect(active()).toHaveLength(2);
  });
  it("the other team is not affected", async () => { order("o1", "t1", 10); await cal.syncOrder("o1", actor); order("o2", "t2", 10); expect((await cal.syncOrder("o2", actor)).ok).toBe(true); });
  it("checks an order before it is saved", async () => {
    order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    const clash = await cal.checkOrderSlot({ teamId: "t1", scheduledAt: at(DAY, 10 * 60 + 30) }); expect(clash.ok).toBe(false);
    expect(await cal.checkOrderSlot({ teamId: "t1", scheduledAt: at(DAY, 12 * 60) })).toMatchObject({ ok: true, managed: true });
    expect(await cal.checkOrderSlot({ orderId: "o1", teamId: "t1", scheduledAt: at(DAY, 10 * 60 + 30) })).toMatchObject({ ok: true }); // moving an order never clashes with itself
  });
  it("when two requests race past the check, the database refuses the second with a friendly message and nothing is left half-saved", async () => {
    order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    order("o2", "t1", 10); mem.raceOnce = true; // the check sees a stale, empty calendar, so only the database constraint can stop it
    const r = await cal.syncOrder("o2", actor); expect(r.ok).toBe(false); expect(!r.ok && r.error).toMatch(/just made|just taken/i);
    expect(active()).toHaveLength(1); expect(mem.entries.some((e) => e.orderId === "o2")).toBe(false);
  });
  it("an authorised override books past a conflict and shows it as a conflict, without breaking the database protection", async () => {
    order("o1", "t1", 10); await cal.syncOrder("o1", actor); order("o2", "t1", 10);
    expect(await cal.syncOrder("o2", actor, { override: true })).toMatchObject({ ok: true }); expect(active().filter((e) => e.override)).toHaveLength(1);
  });
});

describe("booking from the calendar", () => {
  const input = (over: R = {}) => ({ teamId: "t1", start: at(DAY, 15 * 60), end: at(DAY, 16 * 60), customerName: "Omar", phone: "+971501234567", regionId: "r1", area: "Al Helio", serviceId: "s1", quantity: 2, notes: "Ring first", employeeId: "e1", ...over });
  it("creates the customer's order and the booking together, and closes the time", async () => {
    const r = await cal.addBooking(input(), actor); expect(r).toMatchObject({ ok: true, orderNumber: expect.stringMatching(/^ORD-/) });
    expect(mem.orders[0]).toMatchObject({ teamId: "t1", status: "Assigned", assignedToId: "e1", bookableServiceId: "s1", quantity: 2, regionId: "r1", leadSource: "Phone" }); expect(active()[0]).toMatchObject({ orderId: mem.orders[0].id, area: "Al Helio" });
    expect((await cal.addBooking(input({ start: at(DAY, 15 * 60 + 30), end: at(DAY, 16 * 60 + 30) }), actor)).ok).toBe(false); // the same team is busy then
    expect(mem.orders).toHaveLength(1); expect(mem.customers).toHaveLength(1); // a refused booking leaves no order and no new customer behind
    expect(mem.customers[0]).toMatchObject({ name: "Omar", emirate: "Ajman" });
  });
  it("without an employee the order waits as Requested (Pending in the calendar)", async () => { await cal.addBooking(input({ employeeId: null }), actor); expect(mem.orders[0].status).toBe("Requested"); });
  it("books any future date, weeks or months ahead", async () => { expect((await cal.addBooking(input({ start: at("2099-08-20", 15 * 60), end: at("2099-08-20", 16 * 60) }), actor)).ok).toBe(true); });
  it("refuses missing details, an unknown team, service or emirate", async () => {
    for (const bad of [{ customerName: "O" }, { phone: "12" }, { teamId: "nope" }, { serviceId: "nope" }, { regionId: "nope" }, { end: at(DAY, 14 * 60) }]) expect((await cal.addBooking(input(bad), actor)).ok, JSON.stringify(Object.keys(bad))).toBe(false);
  });
  it("blocks a team's time (leave, maintenance) so nobody can book it; a block over a booking is refused", async () => {
    expect(await cal.addBlock({ teamId: "t1", start: at(DAY, 9 * 60), end: at(DAY, 12 * 60), reason: "Vehicle service" }, actor)).toMatchObject({ ok: true });
    order("o1", "t1", 10); expect((await cal.syncOrder("o1", actor)).ok).toBe(false);
    expect(await cal.addBlock({ teamId: "t1", start: at(DAY, 11 * 60), end: at(DAY, 13 * 60), reason: "x" }, actor)).toMatchObject({ ok: false });
    expect((await cal.addBlock({ teamId: "t9", start: at(DAY, 11 * 60), end: at(DAY, 13 * 60), reason: "x" }, actor)).ok).toBe(false);
    const id = active()[0].id; expect(await cal.removeBlock(id, actor)).toMatchObject({ ok: true }); expect((await cal.syncOrder("o1", actor)).ok).toBe(true); // freed
  });
});

describe("automatic team choice", () => {
  it("picks the first team that covers the emirate and service and is free, skipping busy or non-covering teams", async () => {
    mem.schedules = [sched("t1", { regionIds: ["r2"] }), sched("t2")];
    expect(await cal.pickTeam({ regionId: "r1", serviceId: "s1", start: at(DAY, 600), end: at(DAY, 660) })).toBe("t2"); // t1 does not cover r1
    mem.schedules = [sched("t1"), sched("t2")]; order("o1", "t1", 10); await cal.syncOrder("o1", actor);
    expect(await cal.pickTeam({ regionId: "r1", serviceId: "s1", start: at(DAY, 600), end: at(DAY, 660) })).toBe("t2"); // t1 is busy
    order("o2", "t2", 10); await cal.syncOrder("o2", actor);
    expect(await cal.pickTeam({ regionId: "r1", serviceId: "s1", start: at(DAY, 600), end: at(DAY, 660) })).toBeNull(); // everyone busy
  });
});

describe("moving a booking (drag and drop)", () => {
  it("moves it, keeps its duration, and the order follows; the order's history records it", async () => {
    const b = await cal.addBooking({ teamId: "t1", start: at(DAY, 10 * 60), end: at(DAY, 11 * 60 + 30), customerName: "Omar", phone: "+971501234567", regionId: "r1", area: "", serviceId: "s1", quantity: 1, notes: "", employeeId: "e1" }, actor);
    if (!b.ok) throw new Error(b.error); const id = b.entryId;
    expect(await cal.moveEntry(id, { start: at(DAY, 14 * 60) }, actor)).toMatchObject({ ok: true });
    expect(active()[0].endsAt).toEqual(at(DAY, 15 * 60 + 30)); expect(mem.orders[0].scheduledAt).toEqual(at(DAY, 14 * 60)); expect(mem.changes[0]).toMatchObject({ reason: "Moved in the calendar", previousScheduledAt: at(DAY, 10 * 60), newScheduledAt: at(DAY, 14 * 60) });
  });
  it("can change the team, and is refused where the other team is busy", async () => {
    const b = await cal.addBooking({ teamId: "t1", start: at(DAY, 10 * 60), end: at(DAY, 11 * 60), customerName: "Omar", phone: "+971501234567", regionId: "r1", area: "", serviceId: "s1", quantity: 1, notes: "", employeeId: null }, actor);
    if (!b.ok) throw new Error(b.error);
    order("o9", "t2", 10); await cal.syncOrder("o9", actor);
    expect((await cal.moveEntry(b.entryId, { teamId: "t2", start: at(DAY, 10 * 60) }, actor)).ok).toBe(false);
    expect(await cal.moveEntry(b.entryId, { teamId: "t2", start: at(DAY, 13 * 60) }, actor)).toMatchObject({ ok: true }); expect(mem.orders.find((o) => o.id === b.orderId)?.teamId).toBe("t2");
    expect((await cal.entryHistory(b.entryId)).map((e) => e.action)).toEqual(expect.arrayContaining(["created", "reassigned"]));
  });
  it("a booking dropped on itself or on a free neighbour slot never conflicts with itself", async () => {
    const b = await cal.addBooking({ teamId: "t1", start: at(DAY, 10 * 60), end: at(DAY, 11 * 60), customerName: "Omar", phone: "+971501234567", regionId: "r1", area: "", serviceId: "s1", quantity: 1, notes: "", employeeId: null }, actor);
    if (!b.ok) throw new Error(b.error); expect((await cal.moveEntry(b.entryId, { start: at(DAY, 10 * 60 + 30) }, actor)).ok).toBe(true);
  });
});

describe("existing orders", () => {
  it("are placed on the calendar once, and the ones that already clash are kept as conflicts", async () => {
    order("o1", "t1", 10); order("o2", "t1", 10); order("o3", "t2", 9); order("o4", null, 9, { scheduledAt: at(DAY, 9 * 60) });
    const r = await cal.syncExistingOrders(actor); expect(r).toMatchObject({ created: 3, conflicts: 1, skipped: 0 });
    expect(mem.entries.filter((e) => e.override)).toHaveLength(1); expect((await cal.syncExistingOrders(actor)).created).toBe(0);
  });
});

describe("reading the calendar", () => {
  it("gives the status colour key from the order: Pending, Confirmed, In Progress, Completed, Cancelled, Conflict, Blocked", async () => {
    for (const [i, st] of ["Requested", "Assigned", "In Progress", "Done"].entries()) { order(`o${i}`, "t1", 8 + i * 2, { status: st }); await cal.syncOrder(`o${i}`, actor); }
    await cal.addBlock({ teamId: "t1", start: at(DAY, 16 * 60), end: at(DAY, 17 * 60), reason: "Leave" }, actor);
    mem.entries.forEach((e) => { e.team = { name: "Ajman Team 1" }; e.order = mem.orders.find((o) => o.id === e.orderId) ? { ...mem.orders.find((o) => o.id === e.orderId), customer: { name: "Omar", phone: "+9715" } } : null; });
    const items = await cal.listItems({ from: at(DAY, 0), to: at(DAY, 24 * 60) });
    expect(items.map((i) => i.status)).toEqual(["Pending", "Confirmed", "In Progress", "Completed", "Blocked"]); expect(items[0]).toMatchObject({ teamName: "Ajman Team 1", customerName: "Omar" });
  });
});
