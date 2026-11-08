import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, DEFAULT_TEAM_RULES, closedReason, durationFor, type CalendarConfig, type TeamRules } from "./config";
import { availableStarts, checkVisit, firstConflict, nextAvailable, workingSegments, type Busy } from "./engine";
import { addDays, at, dayKey, endOfMonth, fromLocalValue, startOfDay, startOfMonth, startOfWeek, toLocalValue, weekday } from "./time";

const NOW = at("2026-01-01", 8 * 60); // Thursday 01 Jan 2026, 08:00 UAE
const TUE = "2026-01-06";
const cfg = (over: Partial<CalendarConfig> = {}): CalendarConfig => ({ ...DEFAULT_SETTINGS, minNoticeHours: 0, ...over });
const rules = (over: Partial<TeamRules> = {}): TeamRules => ({ ...DEFAULT_TEAM_RULES, workDays: [0, 1, 2, 3, 4, 5, 6], ...over });
const busy = (day: string, from: string, to: string, travel = 30, kind = "BOOKING"): Busy => {
  const s = at(day, Number(from.slice(0, 2)) * 60 + Number(from.slice(3))), e = at(day, Number(to.slice(0, 2)) * 60 + Number(to.slice(3)));
  return { startsAt: s, endsAt: e, busyUntil: new Date(e.getTime() + travel * 60000), kind };
};
const hhmm = (d: Date) => toLocalValue(d).slice(11);
const starts = (o: { r?: Partial<TeamRules>; c?: Partial<CalendarConfig>; b?: Busy[]; dur?: number; day?: string; now?: Date; ignoreLimits?: boolean } = {}) =>
  availableStarts({ day: o.day ?? TUE, rules: rules(o.r), cfg: cfg(o.c), busy: o.b ?? [], durationMin: o.dur ?? 60, now: o.now ?? NOW, ignoreLimits: o.ignoreLimits }).map(hhmm);

describe("UAE time", () => {
  it("keeps every day, week and month in UAE time (UTC+4)", () => {
    expect(dayKey(new Date("2026-01-05T20:30:00Z"))).toBe("2026-01-06"); // 00:30 UAE
    expect(startOfDay("2026-01-06").toISOString()).toBe("2026-01-05T20:00:00.000Z");
    expect(weekday("2026-01-06")).toBe(2); expect(startOfWeek("2026-01-07", 1)).toBe("2026-01-05"); expect(startOfWeek("2026-01-07", 6)).toBe("2026-01-03");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01"); expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); expect(startOfMonth("2026-02-17")).toBe("2026-02-01"); expect(endOfMonth("2026-02-17")).toBe("2026-02-28");
    const d = fromLocalValue("2026-01-06T10:00")!; expect(d.toISOString()).toBe("2026-01-06T06:00:00.000Z"); expect(toLocalValue(d)).toBe("2026-01-06T10:00"); expect(fromLocalValue("2026-13-01T10:00")).toBeNull();
  });
});

describe("how long a visit takes", () => {
  it("uses the service's duration (more units take longer), else the default", () => {
    const c = cfg({ services: { s1: { minutes: 60, perUnit: 20 } } });
    expect(durationFor(c, "s1", 1)).toBe(60); expect(durationFor(c, "s1", 4)).toBe(120); expect(durationFor(c, "other", 4)).toBe(60); expect(durationFor(c, null, null)).toBe(60);
  });
});

describe("working hours and breaks", () => {
  it("offers start times inside the working window, every step, and none that would end after it", () => {
    expect(starts({ r: { startTime: "08:00", endTime: "11:00" }, dur: 60 })).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00"]);
  });
  it("never lets a visit run across a break", () => {
    expect(workingSegments(rules({ startTime: "08:00", endTime: "17:00", breaks: [{ start: "12:00", end: "13:00" }] }))).toEqual([[480, 720], [780, 1020]]);
    const s = starts({ r: { startTime: "08:00", endTime: "17:00", breaks: [{ start: "12:00", end: "13:00" }] }, dur: 120 });
    expect(s).toContain("10:00"); expect(s).not.toContain("11:00"); expect(s).not.toContain("12:00"); expect(s).toContain("13:00");
  });
  it("offers nothing on a day the team does not work, on a holiday, or during a company closure", () => {
    expect(starts({ r: { workDays: [1, 3] } })).toEqual([]); // Tuesday is off
    expect(starts({ c: { holidays: [{ date: TUE, name: "Holiday" }] } })).toEqual([]);
    expect(starts({ c: { closures: [{ from: "2026-01-05", to: "2026-01-07", reason: "Closed" }] } })).toEqual([]);
    expect(closedReason(cfg({ holidays: [{ date: TUE, name: "National Day" }] }), TUE)).toBe("National Day"); expect(closedReason(cfg(), TUE)).toBeNull();
  });
});

describe("the worked example of the brief", () => {
  // Ajman team: 09:00-11:00 and 13:00-15:00 booked, a 2-hour service, 30 minutes between visits.
  const b = [busy(TUE, "09:00", "11:00"), busy(TUE, "13:00", "15:00")];
  it("never offers a time that clashes with a booking or its travel gap", () => {
    const s = starts({ b, dur: 120, r: { startTime: "08:00", endTime: "18:00", travelMinutes: 30 } });
    expect(s).toEqual(["15:30", "16:00"]);
  });
  it("shows the earliest available time", () => { expect(starts({ b, dur: 120 })[0]).toBe("15:30"); });
  it("lets a shorter visit use the gaps", () => {
    const s = starts({ b, dur: 60 });
    expect(s).toContain("11:30"); expect(s).not.toContain("12:00"); expect(s).not.toContain("12:30"); expect(s).not.toContain("08:30"); expect(s).not.toContain("08:00"); // even 08:00-09:00 plus the 30 minutes of travel runs into the 09:00 visit
  });
});

describe("conflicts", () => {
  it("finds the booking a visit runs into, including the travel gap", () => {
    const b = [busy(TUE, "09:00", "11:00")];
    expect(firstConflict(b, at(TUE, 11 * 60), at(TUE, 12 * 60), 0)).toBe(b[0]); // busy until 11:30
    expect(firstConflict(b, at(TUE, 11 * 60 + 30), at(TUE, 12 * 60 + 30), 30)).toBeNull();
    expect(firstConflict(b, at(TUE, 7 * 60), at(TUE, 8 * 60 + 45), 30)).toBe(b[0]); // ends 08:45 + 30 travel
  });
  it("a block is just as busy as a booking", () => { expect(starts({ b: [busy(TUE, "08:00", "18:00", 0, "BLOCK")] })).toEqual([]); });
});

describe("limits", () => {
  it("stops offering times once the team's daily limit is reached (blocks do not count)", () => {
    const two = [busy(TUE, "08:00", "09:00"), busy(TUE, "10:00", "11:00")];
    expect(starts({ b: two, r: { maxPerDay: 2 } })).toEqual([]); expect(starts({ b: two, r: { maxPerDay: 3 } }).length).toBeGreaterThan(0);
    expect(starts({ b: [busy(TUE, "08:00", "09:00"), busy(TUE, "10:00", "11:00", 0, "BLOCK")], r: { maxPerDay: 2 } }).length).toBeGreaterThan(0);
  });
  it("applies the minimum notice, the same-day rule and the advance limit", () => {
    const today = dayKey(NOW);
    expect(starts({ day: today, c: { minNoticeHours: 3 }, r: { startTime: "08:00", endTime: "14:00" } })[0]).toBe("11:00");
    expect(starts({ day: today, c: { sameDayAllowed: false } })).toEqual([]);
    expect(starts({ day: addDays(today, 61), c: { advanceDays: 60 } })).toEqual([]); expect(starts({ day: addDays(today, 60), c: { advanceDays: 60 } }).length).toBeGreaterThan(0);
    expect(starts({ day: "2025-12-31" })).toEqual([]);
  });
  it("an administrator may book past the customer limits", () => {
    expect(starts({ day: dayKey(NOW), c: { sameDayAllowed: false }, ignoreLimits: true }).length).toBeGreaterThan(0);
    expect(starts({ day: addDays(dayKey(NOW), 200), c: { advanceDays: 60 }, ignoreLimits: true }).length).toBeGreaterThan(0);
  });
});

describe("finding the earliest slot", () => {
  it("skips closed and full days", () => {
    const r = rules({ workDays: [2] }); // Tuesdays only
    const n = nextAvailable({ rules: r, cfg: cfg(), busy: [], durationMin: 60, now: NOW }, "2026-01-01", () => []);
    expect(n?.day).toBe("2026-01-06"); expect(hhmm(n!.start)).toBe("08:00");
    const holiday = nextAvailable({ rules: r, cfg: cfg({ holidays: [{ date: "2026-01-06", name: "H" }] }), busy: [], durationMin: 60, now: NOW }, "2026-01-01", () => []);
    expect(holiday?.day).toBe("2026-01-13");
  });
});

describe("checking an exact visit", () => {
  const ok = (o: Partial<Parameters<typeof checkVisit>[0]> = {}) => checkVisit({ rules: rules(), cfg: cfg(), busy: [], start: at(TUE, 10 * 60), end: at(TUE, 12 * 60), now: NOW, ...o });
  it("accepts a free visit and explains every reason otherwise", () => {
    expect(ok()).toEqual([]);
    expect(ok({ rules: rules({ workDays: [1] }) }).map((p) => p.code)).toContain("off-day");
    expect(ok({ start: at(TUE, 6 * 60), end: at(TUE, 8 * 60) }).map((p) => p.code)).toContain("outside-hours");
    expect(ok({ rules: rules({ breaks: [{ start: "11:00", end: "12:00" }] }) }).map((p) => p.code)).toContain("break");
    expect(ok({ busy: [busy(TUE, "11:00", "13:00")] }).map((p) => p.code)).toContain("conflict");
    expect(ok({ cfg: cfg({ holidays: [{ date: TUE, name: "H" }] }) }).map((p) => p.code)).toContain("closed");
    expect(ok({ now: at(TUE, 11 * 60) }).map((p) => p.code)).toContain("past");
    expect(ok({ cfg: cfg({ minNoticeHours: 130 }) }).map((p) => p.code)).toContain("notice");
    expect(ok({ rules: rules({ maxPerDay: 1 }), busy: [busy(TUE, "13:00", "14:00")] }).map((p) => p.code)).toContain("daily-limit");
  });
  it("ignoreLimits skips the customer limits but never the conflicts", () => {
    expect(ok({ now: at(TUE, 11 * 60), ignoreLimits: true })).toEqual([]);
    expect(ok({ ignoreLimits: true, busy: [busy(TUE, "11:00", "13:00")] }).map((p) => p.code)).toContain("conflict");
  });
});
