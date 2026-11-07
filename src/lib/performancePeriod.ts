// Date presets for the performance reports. Days are UAE calendar days (UTC+4, no daylight saving); ranges are inclusive and
// `to` is the end of its day, so a single day is [00:00, 23:59:59.999].

export const PRESETS = ["today", "yesterday", "week", "month", "lastMonth", "quarter", "year", "custom"] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_LABEL: Record<Preset, string> = {
  today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month", lastMonth: "Last Month",
  quarter: "This Quarter", year: "This Year", custom: "Custom Range",
};

export type Period = { preset: Preset; from: Date; to: Date; label: string };

const DAY = 86_400_000;
const startOfDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const endOfDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function uaeToday(now = new Date()): { y: number; m: number; d: number } {
  const t = new Date(now.getTime() + 4 * 3_600_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

function parseDay(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parsePreset(v: string | undefined): Preset {
  return (PRESETS as readonly string[]).includes(v ?? "") ? (v as Preset) : "month";
}

export function resolvePeriod(input: { preset?: string; from?: string; to?: string }, now = new Date()): Period {
  const preset = parsePreset(input.preset);
  const { y, m, d } = uaeToday(now);
  let from: Date;
  let to: Date;
  switch (preset) {
    case "today": from = startOfDay(y, m, d); to = endOfDay(y, m, d); break;
    case "yesterday": from = startOfDay(y, m, d - 1); to = endOfDay(y, m, d - 1); break;
    case "week": {
      const dow = (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Monday = 0
      from = startOfDay(y, m, d - dow); to = endOfDay(y, m, d); break;
    }
    case "lastMonth": from = startOfDay(y, m - 1, 1); to = endOfDay(y, m, 0); break;
    case "quarter": { const q = Math.floor(m / 3) * 3; from = startOfDay(y, q, 1); to = endOfDay(y, q + 3, 0); break; }
    case "year": from = startOfDay(y, 0, 1); to = endOfDay(y, 11, 31); break;
    case "custom": {
      const f = parseDay(input.from);
      const t = parseDay(input.to);
      if (f && t) {
        const [a, b] = f <= t ? [f, t] : [t, f];
        from = a; to = endOfDay(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
      } else { from = startOfDay(y, m, 1); to = endOfDay(y, m + 1, 0); }
      break;
    }
    default: from = startOfDay(y, m, 1); to = endOfDay(y, m + 1, 0);
  }
  return { preset, from, to, label: `${fmt(from)} → ${fmt(to)}` };
}

// The period of the same length that ends the moment before this one starts (for "compare with previous period").
export function previousPeriod(p: Period): Period {
  const len = Math.round((p.to.getTime() - p.from.getTime() + 1) / DAY);
  const to = new Date(p.from.getTime() - 1);
  const from = new Date(p.from.getTime() - len * DAY);
  return { preset: "custom", from, to, label: `${fmt(from)} → ${fmt(to)}` };
}
