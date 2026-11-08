// All calendar times are UAE time (UTC+4, no daylight saving). Instants are stored as UTC; a "day" is a UAE calendar day ("YYYY-MM-DD").

export const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;
export const MIN = 60 * 1000;
export const DAY_MS = 24 * 60 * MIN;

const pad = (n: number) => String(n).padStart(2, "0");

// The UAE calendar day an instant falls on.
export function dayKey(d: Date): string {
  const u = new Date(d.getTime() + UAE_OFFSET_MS);
  return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`;
}

export const isDayKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

// 00:00 UAE of that day, as a UTC instant.
export function startOfDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - UAE_OFFSET_MS);
}

export const addDays = (day: string, n: number): string => dayKey(new Date(startOfDay(day).getTime() + n * DAY_MS + 12 * 60 * MIN));

// 0 = Sunday ... 6 = Saturday.
export const weekday = (day: string): number => new Date(`${day}T12:00:00Z`).getUTCDay();

// The Monday-first week a day belongs to is not assumed: the calendar starts its week on the day the caller chooses (default Saturday in the UAE would
// be a business choice), so only the arithmetic lives here.
export function startOfWeek(day: string, firstDay = 1): string {
  const back = (weekday(day) - firstDay + 7) % 7;
  return addDays(day, -back);
}

export const startOfMonth = (day: string) => `${day.slice(0, 7)}-01`;
export function endOfMonth(day: string): string {
  const [y, m] = day.split("-").map(Number);
  return dayKey(new Date(Date.UTC(y, m, 0, 12)));
}

// "HH:MM" <-> minutes since midnight.
export function toMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

// The instant for a UAE day + "HH:MM" (or minutes after midnight, which may exceed 24h).
export const at = (day: string, minutes: number): Date => new Date(startOfDay(day).getTime() + minutes * MIN);

// Minutes after UAE midnight of the instant's own day.
export function minutesOfDay(d: Date): number {
  const u = new Date(d.getTime() + UAE_OFFSET_MS);
  return u.getUTCHours() * 60 + u.getUTCMinutes();
}

// "YYYY-MM-DDTHH:mm" (UAE) for inputs.
export function toLocalValue(d: Date): string {
  return `${dayKey(d)}T${fromMinutes(minutesOfDay(d))}`;
}
export function fromLocalValue(v: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
  if (!m || !isDayKey(m[1])) return null;
  const mins = toMinutes(m[2]);
  return mins == null ? null : at(m[1], mins);
}
