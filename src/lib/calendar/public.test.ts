import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("./testDb")).db }));

import { mem, type R } from "./testDb";
import * as pub from "./public";
import { saveSettings } from "./service";
import { DEFAULT_SETTINGS } from "./config";
import { at } from "./time";

const NOW = new Date("2099-03-01T00:00:00Z"); // far in the future so the real clock never interferes with notice rules
const DAY = "2099-03-10"; // a Tuesday
const sched = (teamId: string, over: R = {}) => ({ teamId, active: true, regionIds: ["r1"], serviceIds: [], workDays: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "18:00", breaks: [], travelMinutes: 30, maxPerDay: 0, ...over });
const lines = [{ serviceId: "s1", quantity: 1 }];
const busyBooking = (teamId: string, startMin: number, minutes = 60, travel = 30) => mem.entries.push({ id: `b${++mem.seq}`, kind: "BOOKING", teamId, state: "ACTIVE", override: false, expiresAt: null, startsAt: at(DAY, startMin), endsAt: at(DAY, startMin + minutes), busyUntil: at(DAY, startMin + minutes + travel) });
const active = () => mem.entries.filter((e) => e.state === "ACTIVE");
const day = async (over: R = {}) => { const a = await pub.availability({ regionId: "r1", lines, from: DAY, days: 1, ...over }, NOW); if (!a.managed) throw new Error("not managed"); return a.days[0]; };
const ok = (d: { slots: { time: string; ok: boolean }[] }) => d.slots.filter((s) => s.ok).map((s) => s.time);

beforeEach(() => { for (const k of ["schedules", "entries", "events", "orders", "customers", "changes"] as const) mem[k] = []; mem.settings = null; mem.seq = 0; mem.schedules.push(sched("t1"), sched("t2")); });

describe("what a customer can see", () => {
  it("is not managed when no team of the calendar covers the emirate and every service", async () => {
    mem.schedules = [sched("t1", { regionIds: ["r2"] }), sched("t2", { serviceIds: ["s2"] })];
    expect(await pub.availability({ regionId: "r1", lines }, NOW)).toEqual({ managed: false });
    mem.schedules = [];
    expect(await pub.availability({ regionId: "r1", lines }, NOW)).toEqual({ managed: false });
  });
  it("lists the times of the day, and never a team name", async () => {
    const a = await pub.availability({ regionId: "r1", lines, from: DAY, days: 3 }, NOW);
    expect(a).toMatchObject({ managed: true, durationMin: 60, stepMinutes: 30, holdMinutes: 10 });
    if (!a.managed) return;
    expect(a.days.map((d) => d.day)).toEqual(["2099-03-10", "2099-03-11", "2099-03-12"]);
    expect(a.days[0].slots[0]).toEqual({ time: "08:00", ok: true });
    expect(a.first).toEqual({ day: DAY, time: "08:00" });
    expect(JSON.stringify(a)).not.toMatch(/t1|t2|Team/);
  });
  it("shows a time as booked only when every team that could do it is busy", async () => {
    busyBooking("t1", 9 * 60);
    expect(ok(await day())).toContain("09:00"); // team 2 is still free
    busyBooking("t2", 9 * 60);
    const d = await day();
    expect(d.slots.find((s) => s.time === "09:00")).toEqual({ time: "09:00", ok: false });
    expect(d.slots.find((s) => s.time === "08:00")).toEqual({ time: "08:00", ok: false }); // would run into the booking's travel buffer
    expect(ok(d)).toContain("10:30");
  });
  it("uses the service's length (and the sum for services booked together)", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, services: { s1: { minutes: 120, perUnit: 30 }, s2: { minutes: 60, perUnit: 0 } } }, "A");
    expect((await pub.availability({ regionId: "r1", lines: [{ serviceId: "s1", quantity: 3 }], from: DAY, days: 1 }, NOW) as { durationMin: number }).durationMin).toBe(180);
    expect((await pub.availability({ regionId: "r1", lines: [{ serviceId: "s1", quantity: 1 }, { serviceId: "s2", quantity: 1 }], from: DAY, days: 1 }, NOW) as { durationMin: number }).durationMin).toBe(180);
  });
  it("closes holidays, days off and days past the booking window", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, holidays: [{ date: DAY, name: "National Day" }] }, "A");
    expect(await day()).toMatchObject({ closed: "National Day", slots: [] });
    mem.schedules = [sched("t1", { workDays: [1] })]; // Monday only
    expect((await day({ from: "2099-03-11" })).slots).toEqual([]); // a Wednesday
    const far = (await pub.availability({ regionId: "r1", lines, from: "2099-04-25", days: 31 }, NOW)) as { days: { day: string }[] };
    expect(far.days.at(-1)!.day <= "2099-04-30").toBe(true); // 60 days after 2099-03-01
  });
  it("greys out a whole day once the team's daily limit is reached", async () => {
    mem.schedules = [sched("t1", { maxPerDay: 1 })];
    busyBooking("t1", 9 * 60);
    const d = await day();
    expect(d.slots.length).toBeGreaterThan(0);
    expect(ok(d)).toEqual([]);
  });
  it("applies the minimum notice and the same-day rule to the customer", async () => {
    mem.schedules = [sched("t1")];
    const today = "2099-03-01";
    const a = (await pub.availability({ regionId: "r1", lines, from: today, days: 1 }, new Date("2099-02-28T22:00:00Z"))) as { days: { slots: { time: string; ok: boolean }[] }[] }; // 02:00 UAE
    expect(a.days[0].slots.find((s) => s.time === "08:00")!.ok).toBe(true); // 6 hours' notice
    expect(a.days[0].slots.find((s) => s.time === "03:00")).toBeUndefined();
    await saveSettings({ ...DEFAULT_SETTINGS, sameDayAllowed: false }, "A");
    const b = (await pub.availability({ regionId: "r1", lines, from: today, days: 1 }, new Date("2099-02-28T22:00:00Z"))) as { days: { slots: { ok: boolean }[] }[] };
    expect(b.days[0].slots.every((s) => !s.ok)).toBe(true);
  });
  it("rejects nothing it cannot answer: unknown emirate is simply not managed", async () => {
    expect(await pub.availability({ regionId: "nope", lines }, NOW)).toEqual({ managed: false });
  });
});

describe("holding a time", () => {
  const hold = (customerId: string, scheduledAt = `${DAY}T10:00`, l = lines) => pub.createHold({ customerId, regionId: "r1", lines: l, scheduledAt }, NOW);

  it("holds the time on a team and returns only a key and an expiry", async () => {
    const r = await hold("c1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.hold).sort()).toEqual(["durationMin", "expiresAt", "holdKey", "scheduledAt"]);
    expect(new Date(r.hold.expiresAt).getTime()).toBe(NOW.getTime() + 10 * 60000);
    expect(active()).toHaveLength(1);
    expect(active()[0]).toMatchObject({ kind: "HOLD", heldByCustomerId: "c1", startsAt: at(DAY, 600), endsAt: at(DAY, 660), busyUntil: at(DAY, 690) });
  });
  it("shares the work: the next customer for the same time goes to the other team, then nobody can have it", async () => {
    await hold("c1"); await hold("c2");
    expect(new Set(active().map((e) => e.teamId))).toEqual(new Set(["t1", "t2"]));
    const third = await hold("c3");
    expect(third).toMatchObject({ ok: false, code: "slot_taken" });
    expect(active()).toHaveLength(2);
  });
  it("prefers the team with the lighter day", async () => {
    busyBooking("t1", 8 * 60); busyBooking("t1", 13 * 60); busyBooking("t2", 8 * 60);
    await hold("c1", `${DAY}T15:00`);
    expect(active().find((e) => e.kind === "HOLD")!.teamId).toBe("t2");
  });
  it("hides the held time from other customers and frees it when the customer picks another", async () => {
    mem.schedules = [sched("t1")];
    await hold("c1");
    expect(ok(await day())).not.toContain("10:00");
    await hold("c1", `${DAY}T14:00`); // a new hold replaces the old one
    expect(active().filter((e) => e.kind === "HOLD")).toHaveLength(1);
    expect(ok(await day())).toContain("10:00");
    expect(ok(await day())).not.toContain("14:00");
  });
  it("lets the time go when the hold runs out, with no clean-up job needed", async () => {
    mem.schedules = [sched("t1")];
    mem.entries.push({ id: "old", kind: "HOLD", teamId: "t1", state: "ACTIVE", override: false, expiresAt: new Date("2020-01-01T00:10:00Z"), holdKey: "k-old", heldByCustomerId: "c9", startsAt: at(DAY, 600), endsAt: at(DAY, 660), busyUntil: at(DAY, 690) });
    expect(ok(await day())).toContain("10:00"); // an expired hold does not count
    expect((await hold("c2")).ok).toBe(true); // and does not block a new one (it is released under the lock)
    expect(mem.entries.find((e) => e.id === "old")!.state).toBe("CANCELLED");
  });
  it("applies the customer's rules: notice, same-day and a valid time", async () => {
    mem.schedules = [sched("t1")];
    expect(await pub.createHold({ customerId: "c1", regionId: "r1", lines, scheduledAt: "2099-03-01T00:30" }, NOW)).toMatchObject({ ok: false, code: "slot_taken" }); // closed hours + notice
    expect(await pub.createHold({ customerId: "c1", regionId: "r1", lines, scheduledAt: "nonsense" }, NOW)).toMatchObject({ ok: false, code: "invalid_request" });
    expect(await pub.createHold({ customerId: "c1", regionId: "r1", lines, scheduledAt: `${DAY}T07:00` }, NOW)).toMatchObject({ ok: false }); // before the team starts
    expect(await pub.createHold({ customerId: "c1", regionId: "r1", lines, scheduledAt: `${DAY}T17:30` }, NOW)).toMatchObject({ ok: false }); // would end after 18:00
    expect(active()).toHaveLength(0);
  });
  it("is refused when no team is managed for the choice", async () => {
    mem.schedules = [];
    expect(await hold("c1")).toMatchObject({ ok: false, code: "not_managed" });
  });
  it("loses a race gracefully: the database refuses the second and the customer is told the time was taken", async () => {
    mem.schedules = [sched("t1")];
    await hold("c1");
    mem.raceOnce = true; // the second request's check sees a stale, empty calendar, so only the database constraint can stop it
    expect(await hold("c2")).toMatchObject({ ok: false, code: "slot_taken" });
    expect(active().filter((e) => e.kind === "HOLD")).toHaveLength(1);
  });
  it("takes the length of all services booked together", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, services: { s1: { minutes: 60, perUnit: 0 }, s2: { minutes: 90, perUnit: 0 } } }, "A");
    const r = await hold("c1", `${DAY}T10:00`, [{ serviceId: "s1", quantity: 1 }, { serviceId: "s2", quantity: 1 }]);
    expect(r.ok && r.hold.durationMin).toBe(150);
    expect(active()[0].endsAt).toEqual(at(DAY, 750));
  });
});

describe("turning a hold into the booking", () => {
  const made = async (customerId = "c1") => { const r = await pub.createHold({ customerId, regionId: "r1", lines, scheduledAt: `${DAY}T10:00` }, NOW); if (!r.ok) throw new Error(r.error); return r.hold; };
  it("is checked before pricing: only the owner of a live hold may use it", async () => {
    const h = await made();
    expect(await pub.peekHold(h.holdKey, "c1", NOW)).toMatchObject({ ok: true, start: at(DAY, 600), end: at(DAY, 660), regionId: "r1" });
    expect(await pub.peekHold(h.holdKey, "someone-else", NOW)).toMatchObject({ ok: false, code: "hold_expired" });
    expect(await pub.peekHold("unknown-key-123", "c1", NOW)).toMatchObject({ ok: false });
    expect(await pub.peekHold(h.holdKey, "c1", new Date(NOW.getTime() + 11 * 60000))).toMatchObject({ ok: false, code: "hold_expired" });
  });
  it("becomes one booking on the team's calendar, linked to the order, with the hold's key spent", async () => {
    const h = await made();
    const { db } = await import("./testDb");
    const claim = await pub.claimHold(db as never, { holdKey: h.holdKey, customerId: "c1" }, NOW);
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    await pub.attachHold(db as never, claim.claim, { id: "o-1", number: "ORD-X" });
    expect(active()).toHaveLength(1);
    expect(active()[0]).toMatchObject({ kind: "BOOKING", orderId: "o-1", expiresAt: null, holdKey: null, heldByCustomerId: null });
    expect(mem.events.map((e) => e.action)).toEqual(["created"]);
    expect(await pub.peekHold(h.holdKey, "c1", NOW)).toMatchObject({ ok: false }); // cannot be used twice
    expect(await pub.claimHold(db as never, { holdKey: h.holdKey, customerId: "c1" }, NOW)).toMatchObject({ ok: false });
  });
  it("cannot be claimed by someone else or after it ran out", async () => {
    const h = await made();
    const { db } = await import("./testDb");
    expect(await pub.claimHold(db as never, { holdKey: h.holdKey, customerId: "c2" }, NOW)).toMatchObject({ ok: false, code: "hold_expired" });
    expect(await pub.claimHold(db as never, { holdKey: h.holdKey, customerId: "c1" }, new Date(NOW.getTime() + 11 * 60000))).toMatchObject({ ok: false, code: "hold_expired" });
  });
  it("can be given back", async () => {
    const h = await made();
    await pub.releaseHold(h.holdKey, "c2"); // not theirs: nothing happens
    expect(active()).toHaveLength(1);
    await pub.releaseHold(h.holdKey, "c1");
    expect(active()).toHaveLength(0);
  });
});
