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

// The rows for saving a menu, one list per level (parents first), with ids and parent ids already set. Each level is written in
// a single query, so a menu of any size saves quickly instead of one query per item.
export function menuLevels<I extends { children: I[] }, D>(items: I[], row: (i: I, order: number) => D, newId: () => string = () => crypto.randomUUID()): (D & { id: string; parentId: string | null })[][] {
  const levels: (D & { id: string; parentId: string | null })[][] = [];
  const walk = (list: I[], parentId: string | null, level: number) => {
    list.forEach((item, order) => {
      const id = newId();
      (levels[level] ??= []).push({ ...row(item, order), id, parentId });
      walk(item.children, id, level + 1);
    });
  };
  walk(items, null, 0);
  return levels;
}
