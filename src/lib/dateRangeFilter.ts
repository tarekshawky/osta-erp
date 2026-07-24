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
