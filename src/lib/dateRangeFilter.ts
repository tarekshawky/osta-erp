export function buildDateRange(
  year: number | null,
  month: number | null
): { gte: Date; lt: Date } | null {
  if (!year && !month) return null;
  const effectiveYear = year ?? new Date().getFullYear();

  if (month) {
    return {
      gte: new Date(Date.UTC(effectiveYear, month - 1, 1)),
      lt: new Date(Date.UTC(effectiveYear, month, 1)),
    };
  }

  return {
    gte: new Date(Date.UTC(effectiveYear, 0, 1)),
    lt: new Date(Date.UTC(effectiveYear + 1, 0, 1)),
  };
}

// Arbitrary From/To range, for callers (Financial Reports) that need quarters,
// custom ranges, or a tax period rather than a single year/month. Callers often
// pass a date-only "as of"/"to" value, or even the precise current instant
// (e.g. `new Date()` for "today") -- bounding against that raw timestamp would
// wrongly exclude same-day rows stored with a later time-of-day (many Invoice/
// Expense rows here carry a fixed mid-day timestamp), so `to` is always
// normalized to the end of its calendar day. Every Balance Sheet figure already
// does this via its own local `endOfDayUtc` (financialReportsBalanceSheet.ts) --
// without the same normalization here, Income Statement figures (Revenue, every
// ADMIN_EXPENSE_LINES entry, and therefore Retained Earnings) silently excluded
// today's transactions whenever "as at" was left at its default (right now,
// before midnight), throwing the Balance Sheet out of balance by exactly today's
// activity.
export function buildCustomDateRange(from: Date, to: Date): { gte: Date; lte: Date } {
  const endOfDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));
  return { gte: from, lte: endOfDay };
}
