// The page hierarchy (Website → Structure). Pure code: the drag-and-drop screen, the server actions and the tests all
// use these functions. A page has an optional parent and a position among its siblings; neither changes any URL.

export const MAX_TREE_DEPTH = 6; // levels, the top level counts as 1

export type TreeItem = { id: string; parentId: string | null; sortOrder: number };
export type Flat<T extends TreeItem> = T & { depth: number; hasChildren: boolean };
export type LayoutRow = { id: string; parentId: string | null; sortOrder: number };

const byOrder = <T extends TreeItem>(a: T, b: T) => a.sortOrder - b.sortOrder;

// Children of every parent, each list in display order. A parent that does not exist counts as the top level.
export function childrenMap<T extends TreeItem>(items: readonly T[]): Map<string | null, T[]> {
  const ids = new Set(items.map((i) => i.id));
  const map = new Map<string | null, T[]>();
  // `items` arrive in a stable order (sortOrder ties keep their given order), so Array.sort being stable is enough.
  for (const item of [...items].sort(byOrder)) {
    const key = item.parentId && ids.has(item.parentId) && item.parentId !== item.id ? item.parentId : null;
    (map.get(key) ?? map.set(key, []).get(key)!).push(item);
  }
  return map;
}

// The whole tree as one list in display order (depth first). Children of a parent in `collapsed` are left out.
export function flatten<T extends TreeItem>(items: readonly T[], collapsed: ReadonlySet<string> = new Set()): Flat<T>[] {
  const kids = childrenMap(items);
  const out: Flat<T>[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const item of kids.get(parent) ?? []) {
      if (seen.has(item.id)) continue; // a cycle in bad data must not loop forever
      seen.add(item.id);
      const children = kids.get(item.id) ?? [];
      out.push({ ...item, depth, hasChildren: children.length > 0 });
      if (!collapsed.has(item.id)) walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function descendantIds(items: readonly TreeItem[], id: string): Set<string> {
  const kids = childrenMap(items);
  const out = new Set<string>();
  const walk = (parent: string) => {
    for (const c of kids.get(parent) ?? []) {
      if (out.has(c.id)) continue;
      out.add(c.id);
      walk(c.id);
    }
  };
  walk(id);
  return out;
}

export function depthOf(items: readonly TreeItem[], id: string): number {
  const byId = new Map(items.map((i) => [i.id, i]));
  let depth = 0;
  for (let cur = byId.get(id); cur?.parentId && byId.has(cur.parentId) && depth <= items.length; cur = byId.get(cur.parentId)) depth++;
  return depth;
}

// Height of the subtree under `id` (0 = no children).
function subtreeHeight(kids: Map<string | null, TreeItem[]>, id: string, guard = 0): number {
  if (guard > 50) return 0;
  const c = kids.get(id) ?? [];
  return c.length ? 1 + Math.max(...c.map((x) => subtreeHeight(kids, x.id, guard + 1))) : 0;
}

// Why a proposed set of parent/position rows cannot be saved, or null when it is fine. `all` is every existing page.
export function layoutProblem(all: readonly TreeItem[], layout: readonly LayoutRow[]): string | null {
  const ids = new Set(all.map((p) => p.id));
  const next = new Map(all.map((p) => [p.id, { ...p }]));
  const seen = new Set<string>();
  for (const row of layout) {
    if (!ids.has(row.id)) return "A page in the new order no longer exists. Reload the page and try again.";
    if (seen.has(row.id)) return "A page appears twice in the new order.";
    seen.add(row.id);
    if (row.parentId === row.id) return "A page can't be its own parent.";
    if (row.parentId !== null && !ids.has(row.parentId)) return "The chosen parent page no longer exists. Reload the page and try again.";
    if (!Number.isInteger(row.sortOrder) || row.sortOrder < 0 || row.sortOrder > 1_000_000) return "Invalid position.";
    next.set(row.id, { id: row.id, parentId: row.parentId, sortOrder: row.sortOrder });
  }
  const finalItems = [...next.values()];
  // Cycles: walking up from any page must reach the top level.
  for (const p of finalItems) {
    const trail = new Set<string>([p.id]);
    for (let cur = p.parentId; cur; cur = next.get(cur)?.parentId ?? null) {
      if (trail.has(cur)) return "A page can't be placed inside its own sub-page.";
      trail.add(cur);
    }
  }
  for (const p of finalItems) {
    if (depthOf(finalItems, p.id) + 1 > MAX_TREE_DEPTH) return `Pages can be nested at most ${MAX_TREE_DEPTH} levels deep.`;
  }
  return null;
}

// Positions 0,1,2… for every sibling group, in the current display order. Only rows whose parent or position changed
// compared to `before` are returned, so saving touches as little as possible.
export function changedRows<T extends TreeItem>(before: readonly TreeItem[], after: readonly T[]): LayoutRow[] {
  const old = new Map(before.map((p) => [p.id, p]));
  const kids = childrenMap(after);
  const rows: LayoutRow[] = [];
  for (const [parentId, list] of kids) {
    list.forEach((item, index) => {
      const prev = old.get(item.id);
      if (!prev || prev.parentId !== parentId || prev.sortOrder !== index) rows.push({ id: item.id, parentId, sortOrder: index });
    });
  }
  return rows;
}

// Same items with sortOrder rewritten to 0,1,2… inside each sibling group.
export function normalize<T extends TreeItem>(items: readonly T[]): T[] {
  const kids = childrenMap(items);
  const order = new Map<string, { parentId: string | null; sortOrder: number }>();
  for (const [parentId, list] of kids) list.forEach((item, i) => order.set(item.id, { parentId, sortOrder: i }));
  return items.map((item) => ({ ...item, ...(order.get(item.id) ?? {}) }));
}

// ---- drag and drop ----

export type Projection = { depth: number; parentId: string | null };

// Where a dragged row would land: dropped over `overId`, moved sideways by `offsetX` pixels (one level per `indent`).
// `visible` is the displayed list WITHOUT the dragged page's own sub-pages (they travel with it).
export function getProjection(visible: readonly Flat<TreeItem>[], activeId: string, overId: string, offsetX: number, indent: number): Projection | null {
  const overIndex = visible.findIndex((i) => i.id === overId);
  const activeIndex = visible.findIndex((i) => i.id === activeId);
  if (overIndex < 0 || activeIndex < 0) return null;
  const active = visible[activeIndex];
  const moved = [...visible];
  moved.splice(activeIndex, 1);
  moved.splice(overIndex, 0, active);
  const previous = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const wanted = active.depth + Math.round(offsetX / indent);
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const depth = Math.max(minDepth > maxDepth ? maxDepth : minDepth, Math.min(wanted, maxDepth));
  let parentId: string | null = null;
  if (depth > 0 && previous) {
    if (depth === previous.depth) parentId = previous.parentId;
    else if (depth > previous.depth) parentId = previous.id;
    else parentId = [...moved.slice(0, overIndex)].reverse().find((i) => i.depth === depth)?.parentId ?? null;
  }
  return { depth, parentId };
}

// The full list of pages after dropping `activeId` over `overId` with the given projection. Collapsed groups keep their order.
export function applyMove<T extends TreeItem>(items: readonly T[], collapsed: ReadonlySet<string>, activeId: string, overId: string, projection: Projection): T[] {
  const hidden = descendantIds(items, activeId);
  const shown = flatten(items, collapsed).filter((i) => !hidden.has(i.id));
  const from = shown.findIndex((i) => i.id === activeId);
  const to = shown.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0) return [...items];
  const order = shown.map((i) => i.id);
  order.splice(from, 1);
  order.splice(to, 0, activeId);
  return reorder(items, order, activeId, projection.parentId);
}

// Rebuilds sortOrder from `order` (ids in display order; pages not listed keep their relative order after the listed ones
// of the same parent) after giving `activeId` a new parent.
function reorder<T extends TreeItem>(items: readonly T[], order: readonly string[], activeId: string, newParent: string | null): T[] {
  const withParent = items.map((i) => (i.id === activeId ? { ...i, parentId: newParent } : i));
  const position = new Map(order.map((id, i) => [id, i]));
  const sorted = [...withParent].sort((a, b) => {
    const pa = position.get(a.id);
    const pb = position.get(b.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return a.sortOrder - b.sortOrder;
  });
  return normalize(sorted.map((s, i) => ({ ...s, sortOrder: i })));
}

// ---- button moves (keyboard and phone friendly alternatives to dragging) ----

const siblings = <T extends TreeItem>(items: readonly T[], parentId: string | null) => childrenMap(items).get(parentId) ?? [];

function place<T extends TreeItem>(items: readonly T[], id: string, parentId: string | null, index: number): T[] {
  // (Computed on the full list: removing the page first would turn its own sub-pages into top-level pages.)
  const target = siblings(items, parentId).filter((i) => i.id !== id).map((i) => i.id);
  target.splice(Math.max(0, Math.min(index, target.length)), 0, id);
  const pos = new Map(target.map((tid, i) => [tid, i]));
  const moved = items.map((i) => (i.id === id ? { ...i, parentId } : i));
  return normalize(moved.map((i) => (pos.has(i.id) ? { ...i, sortOrder: pos.get(i.id)! } : i)));
}

export function moveUp<T extends TreeItem>(items: readonly T[], id: string): T[] {
  const me = items.find((i) => i.id === id);
  if (!me) return [...items];
  const list = siblings(items, me.parentId);
  const at = list.findIndex((i) => i.id === id);
  return at <= 0 ? [...items] : place(items, id, me.parentId, at - 1);
}

export function moveDown<T extends TreeItem>(items: readonly T[], id: string): T[] {
  const me = items.find((i) => i.id === id);
  if (!me) return [...items];
  const list = siblings(items, me.parentId);
  const at = list.findIndex((i) => i.id === id);
  return at < 0 || at >= list.length - 1 ? [...items] : place(items, id, me.parentId, at + 1);
}

// True when the page can move under the sibling just above it (and the tree stays within its depth limit).
export function canIndent(items: readonly TreeItem[], id: string): boolean {
  const me = items.find((i) => i.id === id);
  if (!me) return false;
  const list = siblings(items, me.parentId);
  const at = list.findIndex((i) => i.id === id);
  if (at <= 0) return false;
  return depthOf(items, list[at - 1].id) + 1 + subtreeHeight(childrenMap(items), id) + 1 <= MAX_TREE_DEPTH;
}

// Becomes the last sub-page of the sibling just above.
export function indent<T extends TreeItem>(items: readonly T[], id: string): T[] {
  if (!canIndent(items, id)) return [...items];
  const me = items.find((i) => i.id === id)!;
  const list = siblings(items, me.parentId);
  const newParent = list[list.findIndex((i) => i.id === id) - 1].id;
  return place(items, id, newParent, siblings(items, newParent).length);
}

// Moves up one level, right after its old parent.
export function outdent<T extends TreeItem>(items: readonly T[], id: string): T[] {
  const me = items.find((i) => i.id === id);
  const parent = me?.parentId ? items.find((i) => i.id === me.parentId) : undefined;
  if (!me || !parent) return [...items];
  const uncles = siblings(items, parent.parentId);
  return place(items, id, parent.parentId, uncles.findIndex((i) => i.id === parent.id) + 1);
}


// ---- helpers for pickers ----

// Pages in display order with their depth, for a "Parent page" dropdown. `exclude` hides a page and everything under it.
export function parentOptions<T extends TreeItem & { titleEn: string }>(items: readonly T[], exclude?: string): { id: string; label: string; depth: number }[] {
  const hidden = exclude ? new Set([exclude, ...descendantIds(items, exclude)]) : new Set<string>();
  return flatten(items)
    .filter((i) => !hidden.has(i.id) && i.depth + 1 < MAX_TREE_DEPTH)
    .map((i) => ({ id: i.id, label: `${"— ".repeat(i.depth)}${i.titleEn}`, depth: i.depth }));
}

// Position for a new page added as the last child of `parentId`.
export function nextSortOrder(items: readonly TreeItem[], parentId: string | null): number {
  const list = siblings(items, parentId);
  return list.length ? Math.max(...list.map((i) => i.sortOrder)) + 1 : 0;
}

// Moves a page (with its sub-pages) to be the last child of `parentId` (null = top level).
export function moveToParent<T extends TreeItem>(items: readonly T[], id: string, parentId: string | null): T[] {
  const me = items.find((i) => i.id === id);
  if (!me || (me.parentId ?? null) === parentId) return [...items];
  return place(items, id, parentId, Number.MAX_SAFE_INTEGER);
}
