import { DUBAI_TZ } from "./constants";

// Asia/Dubai is UTC+4 all year (no daylight saving), so conversions are a fixed 4-hour shift.
const DUBAI_OFFSET_MS = 4 * 3_600_000;

// "2026-11-01T18:00" typed as Dubai time -> the real instant.
export function dubaiLocalToDate(value: string | null | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(v);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)) - DUBAI_OFFSET_MS;
  const d = new Date(ms);
  return isNaN(+d) ? null : d;
}

// The instant as Dubai wall-clock "YYYY-MM-DDTHH:mm" (what <input type="datetime-local"> shows).
export function dateToDubaiLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d.getTime() + DUBAI_OFFSET_MS);
  return x.toISOString().slice(0, 16);
}
export const dateToDubaiDay = (d: Date | null | undefined) => dateToDubaiLocal(d).slice(0, 10);

export function formatDubaiDate(d: Date, lang: "ar" | "en", withTime = false): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: DUBAI_TZ, ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) };
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", opts).format(d);
}
