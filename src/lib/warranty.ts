// Per-invoice warranty: the choice made in the invoice wizard, the dates it produces, and how it is shown. Pure (no database), so the
// wizard, the server action, the invoice card and the Warranty list all agree.
//
// Stored on the invoice: warrantyMode null = made before the choice existed (the old fixed 14 days, left as it was), "NONE" = no
// warranty, "WITH" = warrantyDays counted from warrantyStartDate (the day the work was completed; null while still Pending).

export const WARRANTY_DURATIONS = [7, 14, 30] as const;
export type WarrantyDuration = (typeof WARRANTY_DURATIONS)[number];

// The warranty a pre-existing invoice carried: 14 days from the invoice date.
export const LEGACY_WARRANTY_DAYS = 14;

// What the wizard holds. "" = not chosen yet; "LEGACY" only appears when editing an invoice made before this choice existed.
export type WarrantyFormData = {
  mode: "" | "NONE" | "WITH" | "LEGACY";
  days: "" | "7" | "14" | "30";
  // When the warranty starts: the invoice date, another date (the work was done on a different day), or not yet (work unfinished).
  startMode: "INVOICE_DATE" | "DATE" | "PENDING";
  startDate: string;
};

export const emptyWarranty: WarrantyFormData = { mode: "", days: "", startMode: "INVOICE_DATE", startDate: "" };

export type WarrantyFields = {
  warrantyMode: "NONE" | "WITH";
  warrantyDays: number | null;
  warrantyStartDate: Date | null;
  warrantyUntil: Date | null;
};

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Where the warranty starts and ends for a "With warranty" choice. start is null while the work is not completed.
export function warrantyDates(days: number, startMode: WarrantyFormData["startMode"], startDate: string, invoiceDate: Date) {
  if (startMode === "PENDING") return { start: null, until: null };
  const start = startMode === "INVOICE_DATE" ? invoiceDate : parseDay(startDate);
  return start ? { start, until: addDays(start, days) } : null;
}

// Validates the wizard's choice and turns it into the invoice's warranty columns. Nothing is ever chosen on the staff's behalf: an
// empty choice is an error, and "With warranty" needs a duration.
export function resolveWarranty(input: WarrantyFormData, invoiceDate: Date): { ok: true; value: WarrantyFields } | { ok: false; error: string } {
  if (input.mode === "NONE") return { ok: true, value: { warrantyMode: "NONE", warrantyDays: null, warrantyStartDate: null, warrantyUntil: null } };
  if (input.mode !== "WITH") return { ok: false, error: "Choose No Warranty or With Warranty." };
  const days = Number(input.days);
  if (!(WARRANTY_DURATIONS as readonly number[]).includes(days)) return { ok: false, error: "Choose the warranty duration: 7, 14 or 30 days." };
  const dates = warrantyDates(days, input.startMode, input.startDate, invoiceDate);
  if (!dates) return { ok: false, error: "Enter a valid date for when the work was completed." };
  return { ok: true, value: { warrantyMode: "WITH", warrantyDays: days, warrantyStartDate: dates.start, warrantyUntil: dates.until } };
}

// True when the wizard's warranty choice is complete enough to move on (the server still re-validates everything).
export function warrantyChoiceComplete(input: WarrantyFormData): boolean {
  if (input.mode === "NONE" || input.mode === "LEGACY") return true;
  if (input.mode !== "WITH" || !input.days) return false;
  return input.startMode !== "DATE" || parseDay(input.startDate) !== null;
}

type WarrantyRecord = {
  warrantyMode: string | null;
  warrantyDays: number | null;
  warrantyStartDate: Date | null;
  warrantyUntil: Date | null;
};

// The wizard's starting state when an existing invoice is edited.
export function warrantyFormOf(invoice: WarrantyRecord, invoiceDate: Date): WarrantyFormData {
  if (invoice.warrantyMode === null) return invoice.warrantyUntil ? { ...emptyWarranty, mode: "LEGACY" } : emptyWarranty;
  if (invoice.warrantyMode === "NONE") return { ...emptyWarranty, mode: "NONE" };
  const days = String(invoice.warrantyDays ?? "") as WarrantyFormData["days"];
  if (!invoice.warrantyStartDate) return { mode: "WITH", days, startMode: "PENDING", startDate: "" };
  const start = invoice.warrantyStartDate.toISOString().slice(0, 10);
  return { mode: "WITH", days, startMode: start === invoiceDate.toISOString().slice(0, 10) ? "INVOICE_DATE" : "DATE", startDate: start };
}

export type WarrantyStatus = "NO_WARRANTY" | "PENDING" | "ACTIVE" | "EXPIRED";

// The UAE calendar day (UTC+4) a moment falls on, so a warranty runs through the whole of its last day there.
function dayKey(d: Date) {
  return new Date(d.getTime() + 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function warrantyStatusOf(invoice: WarrantyRecord, now: Date = new Date()): WarrantyStatus {
  const legacy = invoice.warrantyMode === null;
  if (invoice.warrantyMode === "NONE" || (legacy && !invoice.warrantyUntil)) return "NO_WARRANTY";
  if (!legacy && (!invoice.warrantyStartDate || !invoice.warrantyUntil)) return "PENDING";
  if (!legacy && dayKey(invoice.warrantyStartDate!) > dayKey(now)) return "PENDING";
  return dayKey(now) <= dayKey(invoice.warrantyUntil!) ? "ACTIVE" : "EXPIRED";
}

export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  NO_WARRANTY: "No Warranty",
  PENDING: "Pending",
  ACTIVE: "Active",
  EXPIRED: "Expired",
};

// What the invoice shows.
export type WarrantyDisplay =
  | { kind: "NONE" }
  | { kind: "LEGACY"; until: Date }
  | { kind: "WITH"; days: number; start: Date | null; until: Date | null };

export function warrantyDisplayOf(invoice: WarrantyRecord): WarrantyDisplay {
  if (invoice.warrantyMode === null) return invoice.warrantyUntil ? { kind: "LEGACY", until: invoice.warrantyUntil } : { kind: "NONE" };
  if (invoice.warrantyMode === "NONE" || !invoice.warrantyDays) return { kind: "NONE" };
  return { kind: "WITH", days: invoice.warrantyDays, start: invoice.warrantyStartDate, until: invoice.warrantyUntil };
}

// The warranty days that the invoice's own terms refer to (term 3), or null when there is no warranty to void.
export function termsWarrantyDays(display: WarrantyDisplay): number | null {
  if (display.kind === "LEGACY") return LEGACY_WARRANTY_DAYS;
  return display.kind === "WITH" ? display.days : null;
}

// A short, readable line for the activity log.
export function describeWarranty(record: WarrantyRecord): string {
  const d = warrantyDisplayOf(record);
  if (d.kind === "NONE") return "No warranty";
  if (d.kind === "LEGACY") return `Legacy ${LEGACY_WARRANTY_DAYS} days until ${d.until.toISOString().slice(0, 10)}`;
  const span = d.start && d.until ? `${d.start.toISOString().slice(0, 10)} to ${d.until.toISOString().slice(0, 10)}` : "pending, work not completed";
  return `${d.days} days (${span})`;
}
