import { z } from "zod";

// The calendar's global rules, edited in Calendar & Scheduling → Settings. Everything here is a starting value an administrator can change;
// nothing about how long a service takes is assumed beyond the default below, which is shown and editable.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const SettingsSchema = z.object({
  // How far ahead a booking may be made (days) and how much notice is needed (hours).
  advanceDays: z.number().int().min(1).max(730),
  minNoticeHours: z.number().min(0).max(720),
  sameDayAllowed: z.boolean(),
  // Used for any service without its own duration, and for orders that already existed before the calendar.
  defaultDurationMin: z.number().int().min(15).max(1440),
  // How often a start time is offered (minutes).
  stepMinutes: z.number().int().min(5).max(240),
  // How long a customer's chosen time is held while they fill in their details (minutes).
  holdMinutes: z.number().int().min(1).max(120),
  holidays: z.array(z.object({ date: day, name: z.string().max(120) })).max(200),
  closures: z.array(z.object({ from: day, to: day, reason: z.string().max(200) })).max(100),
  // Duration of each bookable service: minutes for one unit, plus minutes for every additional unit.
  services: z.record(z.string(), z.object({ minutes: z.number().int().min(5).max(1440), perUnit: z.number().int().min(0).max(1440) })),
});
export type CalendarConfig = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: CalendarConfig = {
  advanceDays: 60, minNoticeHours: 2, sameDayAllowed: true, defaultDurationMin: 60, stepMinutes: 30, holdMinutes: 10, holidays: [], closures: [], services: {},
};

export function parseSettings(raw: unknown): CalendarConfig {
  const r = SettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SETTINGS;
}

// How long a visit takes: the service's own duration (more units take longer), else the default.
export function durationFor(cfg: CalendarConfig, serviceId: string | null | undefined, quantity: number | null | undefined): number {
  const s = serviceId ? cfg.services[serviceId] : undefined;
  const q = Math.max(1, Math.floor(quantity ?? 1));
  return s ? s.minutes + s.perUnit * (q - 1) : cfg.defaultDurationMin;
}

// A day nobody works (public holiday or company closure).
export function closedReason(cfg: CalendarConfig, dayKey: string): string | null {
  const h = cfg.holidays.find((x) => x.date === dayKey);
  if (h) return h.name || "Public holiday";
  const c = cfg.closures.find((x) => x.from <= dayKey && dayKey <= x.to);
  return c ? c.reason || "Company closed" : null;
}

// ---- a team's own schedule ----
export type TeamRules = { workDays: number[]; startTime: string; endTime: string; breaks: { start: string; end: string }[]; travelMinutes: number; maxPerDay: number };

export const TeamRulesSchema = z.object({
  workDays: z.array(z.number().int().min(0).max(6)).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  breaks: z.array(z.object({ start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })).max(6),
  travelMinutes: z.number().int().min(0).max(480), maxPerDay: z.number().int().min(0).max(100),
});

export const DEFAULT_TEAM_RULES: TeamRules = { workDays: [1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "18:00", breaks: [], travelMinutes: 30, maxPerDay: 0 };

export function parseBreaks(raw: unknown): { start: string; end: string }[] {
  const r = TeamRulesSchema.shape.breaks.safeParse(raw);
  return r.success ? r.data : [];
}
