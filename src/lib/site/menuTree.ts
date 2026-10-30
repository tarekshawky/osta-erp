// Menus are stored as rows with a parent id and read back as a tree (top level, sub-items, and sub-items of sub-items).
export const MENU_MAX_DEPTH = 3;

type Row = { id: string; menu: string; parentId: string | null };

// The rows of one menu as a nested tree, in the order the rows are given (already sorted by sortOrder).
export function buildMenuTree<R extends Row, T>(rows: R[], menu: string, shape: (r: R) => T): (T & { children: unknown[] })[] {
  const byParent = new Map<string | null, R[]>();
  for (const r of rows) {
    if (r.menu !== menu) continue;
    const list = byParent.get(r.parentId) ?? [];
    list.push(r);
    byParent.set(r.parentId, list);
  }
  const walk = (parent: string | null, seen: Set<string>): (T & { children: unknown[] })[] =>
    (byParent.get(parent) ?? []).filter((r) => !seen.has(r.id)).map((r) => ({ ...shape(r), children: walk(r.id, new Set([...seen, r.id])) }));
  return walk(null, new Set());
}

// Prisma data for creating an item together with all of its descendants in one nested create.
export type NestedCreate<D> = D & { children?: { create: NestedCreate<D>[] } };
export function nestedCreate<I extends { children: I[] }, D>(item: I, order: number, row: (i: I, order: number) => D): NestedCreate<D> {
  const data = { ...row(item, order) } as NestedCreate<D>;
  if (item.children.length) data.children = { create: item.children.map((c, j) => nestedCreate(c, j, row)) };
  return data;
}
