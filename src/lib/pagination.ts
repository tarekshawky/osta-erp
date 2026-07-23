export const PAGE_SIZE = 10;

export function parsePage(page: string | undefined) {
  const n = Number(page);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
