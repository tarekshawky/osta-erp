// Pricing rules from the master price list: a minimum order, an emergency off-hours surcharge and a holiday surcharge.
// Pure (no database), so the booking app can copy this file verbatim for its live preview.

export type PricingRules = {
  minimumOrderFils: number;
  offHoursPercent: number; // added to an EMERGENCY booking outside normal hours
  holidayPercent: number; // added to any booking on a holiday
  normalStart: string; // "08:00"
  normalEnd: string; // "18:00"
  holidays: string[]; // "YYYY-MM-DD"
};

export const DEFAULT_RULES: PricingRules = { minimumOrderFils: 10000, offHoursPercent: 50, holidayPercent: 25, normalStart: "08:00", normalEnd: "18:00", holidays: [] };

const inRange = (t: string, start: string, end: string) => (start <= end ? t >= start && t < end : t >= start || t < end);

// `local` is the appointment as UAE wall-clock time "YYYY-MM-DDTHH:mm". The larger surcharge applies when both do (never stacked).
export function surchargeFor(rules: PricingRules, bookingTypeCode: string, local: string | null | undefined): { percent: number; kind: "OFF_HOURS" | "HOLIDAY" } | null {
  if (!local || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const holiday = rules.holidays.includes(local.slice(0, 10)) && rules.holidayPercent > 0 ? { percent: rules.holidayPercent, kind: "HOLIDAY" as const } : null;
  const offHours = bookingTypeCode === "EMERGENCY" && rules.offHoursPercent > 0 && !inRange(local.slice(11, 16), rules.normalStart, rules.normalEnd) ? { percent: rules.offHoursPercent, kind: "OFF_HOURS" as const } : null;
  if (holiday && offHours) return holiday.percent > offHours.percent ? holiday : offHours;
  return holiday ?? offHours;
}

// UAE time is UTC+4 all year (no daylight saving).
export const uaeLocal = (d: Date) => new Date(d.getTime() + 4 * 3600_000).toISOString().slice(0, 16);

export function rulesProblem(r: PricingRules): string | null {
  if (!Number.isInteger(r.minimumOrderFils) || r.minimumOrderFils < 0 || r.minimumOrderFils > 100_000_000) return "The minimum order must be an amount in AED (0 = none).";
  for (const p of [r.offHoursPercent, r.holidayPercent]) if (!Number.isFinite(p) || p < 0 || p > 300) return "A surcharge must be between 0% and 300%.";
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!hhmm.test(r.normalStart) || !hhmm.test(r.normalEnd)) return "Normal hours must be times like 08:00.";
  if (r.holidays.some((h) => !/^\d{4}-\d{2}-\d{2}$/.test(h) || Number.isNaN(Date.parse(h)))) return "Holidays must be dates like 2026-12-02.";
  return null;
}
