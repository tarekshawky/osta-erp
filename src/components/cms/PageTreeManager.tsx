"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragMoveEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { NewPageForm } from "@/components/cms/NewPageForm";
import { scoreStyle } from "@/lib/seo/scoreStyle";
import {
  applyMove, canIndent, changedRows, descendantIds, flatten, getProjection, indent, moveDown, moveUp, outdent, parentOptions,
  type Flat,
} from "@/lib/cms/pageTree";

export type TreePage = {
  id: string; parentId: string | null; sortOrder: number;
  titleEn: string; titleAr: string; slug: string; status: string; type: string; isHomepage: boolean; score: number;
  menus: string[]; // keys of the navigation menus that link to this page
};
type Result = { ok: boolean; error?: string };
export type TreeActions = {
  saveLayout: (rows: { id: string; parentId: string | null; sortOrder: number }[]) => Promise<Result>;
  setInMenu: (pageId: string, menu: string, inMenu: boolean) => Promise<Result>;
  publish: (pageId: string) => Promise<Result>;
  unpublish: (pageId: string) => Promise<Result>;
  preview: (pageId: string) => Promise<Result & { url?: string }>;
};

const INDENT = 28;
const COLLAPSED_KEY = "osta:structure:collapsed";
export const MENU_LABELS: Record<string, string> = { header: "Header", services: "Services", locations: "Locations", mobile: "Mobile", footer: "Footer" };
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700", DRAFT: "bg-slate-100 text-slate-600", SCHEDULED: "bg-amber-50 text-amber-700", ARCHIVED: "bg-slate-100 text-slate-400",
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: "Published", DRAFT: "Draft", SCHEDULED: "Scheduled", ARCHIVED: "Archived" };

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

type RowProps = {
  item: Flat<TreePage>; depth: number; expanded: boolean; dragging: boolean; sortable: boolean; path?: string;
  all: TreePage[]; busy: boolean;
  onToggle: () => void; onMove: (kind: "up" | "down" | "indent" | "outdent") => void; onAddChild: () => void;
  onMenu: (menu: string, inMenu: boolean) => void; onStatus: () => void; onPreview: () => void;
};

function Row({ item, depth, expanded, dragging, sortable, path, all, busy, onToggle, onMove, onAddChild, onMenu, onStatus, onPreview }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !sortable });
  const published = item.status === "PUBLISHED";
  const icon = item.isHomepage ? "🏠" : item.hasChildren ? "📁" : "📄";
  const url = item.isHomepage ? "/" : `/${item.slug}`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, paddingInlineStart: depth * INDENT }}
      className={`${isDragging ? "relative z-10 opacity-60" : ""}`}
    >
      <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2 sm:flex-nowrap ${dragging ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
        <button type="button" aria-label={`Drag ${item.titleEn}`} disabled={!sortable} className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-slate-300 hover:text-slate-500 disabled:cursor-default disabled:opacity-30" {...attributes} {...listeners}>
          ⋮⋮
        </button>
        {item.hasChildren ? (
          <button type="button" aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${item.titleEn}`} onClick={onToggle} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
            <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▸</span>
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )}
        <span aria-hidden className="shrink-0 text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link href={`/admin/website/pages/${item.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600">{item.titleEn}</Link>
            <span className="truncate text-xs text-slate-400" dir="rtl">{item.titleAr}</span>
            {item.hasChildren && !expanded && <span className="text-[11px] text-slate-400">({all.filter((p) => p.parentId === item.id).length} inside)</span>}
          </div>
          <p className="truncate font-mono text-[11px] text-slate-400">{path ? `${path} › ` : ""}{url}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[item.status] ?? ""}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
        <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${scoreStyle(item.score)}`} title="SEO score">{item.score}</span>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label="Move up" onClick={() => onMove("up")} disabled={busy}>↑</IconBtn>
          <IconBtn label="Move down" onClick={() => onMove("down")} disabled={busy}>↓</IconBtn>
          <IconBtn label="Move out one level" onClick={() => onMove("outdent")} disabled={busy || !item.parentId}>⇤</IconBtn>
          <IconBtn label="Move in one level (under the page above)" onClick={() => onMove("indent")} disabled={busy || !canIndent(all, item.id)}>⇥</IconBtn>
        </div>

        <details className="relative shrink-0">
          <summary className="cursor-pointer list-none rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
            Menus{item.menus.length > 0 && <span className="ml-1 rounded-full bg-blue-50 px-1.5 text-[10px] font-semibold text-blue-700">{item.menus.length}</span>}
          </summary>
          <div className="absolute end-0 top-8 z-30 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <p className="px-1 pb-1 text-[11px] font-medium uppercase text-slate-400">Show this page in</p>
            {Object.entries(MENU_LABELS).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={item.menus.includes(key)} disabled={busy} onChange={(e) => onMenu(key, e.target.checked)} /> {label} menu
              </label>
            ))}
            <Link href="/admin/website/menus" className="mt-1 block px-1 text-xs text-blue-600">Edit menus →</Link>
          </div>
        </details>

        <div className="flex shrink-0 items-center gap-1 text-xs">
          <button type="button" onClick={onAddChild} className="rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50">+ Sub-page</button>
          <button type="button" onClick={onPreview} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">Preview</button>
          {!item.isHomepage && (
            <button type="button" onClick={onStatus} disabled={busy} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50">{published ? "Unpublish" : "Publish"}</button>
          )}
          <Link href={`/admin/website/pages/${item.id}`} className="rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50">Edit</Link>
        </div>
      </div>
    </li>
  );
}

export function PageTreeManager({ pages, actions }: { pages: TreePage[]; actions: TreeActions }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<TreePage[]>(pages);
  const saved = useRef<TreePage[]>(pages);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null | undefined>(undefined); // undefined = closed, null = top level, id = under that page

  // Which branches were collapsed last time (kept in this browser only).
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const raw = window.localStorage.getItem(COLLAPSED_KEY);
        if (raw) setCollapsed(new Set((JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string")));
      } catch {
        /* no storage: everything starts expanded */
      }
    });
  }, []);
  const remember = (next: Set<string>) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const filtering = query.trim() !== "" || statusFilter !== "all";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const visible = useMemo<Flat<TreePage>[]>(() => {
    if (filtering) {
      const q = query.trim().toLowerCase();
      return flatten(items)
        .filter((i) => (statusFilter === "all" || i.status === statusFilter) && (!q || `${i.titleEn} ${i.titleAr} ${i.slug}`.toLowerCase().includes(q)))
        .map((i) => ({ ...i, depth: 0 }));
    }
    const hidden = activeId ? descendantIds(items, activeId) : new Set<string>();
    return flatten(items, collapsed).filter((i) => !hidden.has(i.id));
  }, [items, collapsed, query, statusFilter, filtering, activeId]);

  const projection = useMemo(() => (activeId && overId ? getProjection(visible, activeId, overId, offsetX, INDENT) : null), [visible, activeId, overId, offsetX]);

  const persist = useCallback(
    async (next: TreePage[]) => {
      const rows = changedRows(saved.current, next);
      if (rows.length === 0) return;
      const before = saved.current;
      setItems(next);
      setBusy(true);
      const res = await actions.saveLayout(rows);
      setBusy(false);
      if (res.ok) {
        saved.current = next;
        showToast("Structure saved");
      } else {
        setItems(before);
        showToast(res.error ?? "Could not save the structure", "error");
      }
    },
    [actions, showToast],
  );

  const resetDrag = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  };
  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  };
  const onDragMove = (e: DragMoveEvent) => setOffsetX(e.delta.x);
  const onDragOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);
  const onDragEnd = (e: DragEndEvent) => {
    const a = String(e.active.id);
    const o = e.over ? String(e.over.id) : null;
    const proj = o ? getProjection(visible, a, o, e.delta.x, INDENT) : null;
    resetDrag();
    if (!o || !proj) return;
    void persist(applyMove(items, collapsed, a, o, proj));
  };

  const act = async (fn: () => Promise<Result>, ok: string, after?: () => void) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      after?.();
      showToast(ok);
    } else showToast(res.error ?? "Something went wrong", "error");
  };

  const setStatus = (id: string, status: string) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
    saved.current = saved.current.map((i) => (i.id === id ? { ...i, status } : i));
  };
  const setMenu = (id: string, menu: string, inMenu: boolean) => {
    const f = (list: TreePage[]) => list.map((i) => (i.id === id ? { ...i, menus: inMenu ? [...new Set([...i.menus, menu])] : i.menus.filter((m) => m !== menu) } : i));
    setItems(f);
    saved.current = f(saved.current);
  };

  const parents = parentOptions(items);
  const counts = items.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {});
  const parentIds = new Set(items.map((i) => i.parentId).filter((x): x is string => !!x));
  const pathOf = (id: string) => {
    const names: string[] = [];
    for (let cur = byId.get(id)?.parentId; cur && names.length < 8; cur = byId.get(cur)?.parentId) names.unshift(byId.get(cur)?.titleEn ?? "");
    return names.join(" › ");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Pages {items.length}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Published {counts.PUBLISHED ?? 0}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Draft {counts.DRAFT ?? 0}</span>
        {(counts.SCHEDULED ?? 0) > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Scheduled {counts.SCHEDULED}</span>}
        <span className="ms-auto text-xs text-slate-400" aria-live="polite">{busy ? "Saving…" : "Changes are saved automatically"}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className={`${inputClassName} max-w-xs`} placeholder="Search pages…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search pages" />
        <select className={`${inputClassName} max-w-[11rem]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
        <button type="button" onClick={() => remember(new Set())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Expand all</button>
        <button type="button" onClick={() => remember(new Set(parentIds))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Collapse all</button>
        <button type="button" onClick={() => setAdding(null)} className="ms-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ New page</button>
      </div>

      {adding !== undefined && (
        <NewPageForm key={String(adding)} startOpen parents={parents} defaultParentId={adding ?? ""} onCancel={() => setAdding(undefined)} />
      )}

      {filtering && <p className="mb-3 text-xs text-slate-500">Showing search results as a flat list. Clear the search and filter to drag pages and change the structure.</p>}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">{items.length === 0 ? "No pages yet. Create your first one." : "No pages match."}</p>
      ) : (
        <DndContext id="page-tree" sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={resetDrag}>
          <SortableContext items={visible.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5" aria-label="Website pages">
              {visible.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  depth={item.id === activeId && projection ? projection.depth : item.depth}
                  expanded={!collapsed.has(item.id)}
                  dragging={item.id === activeId}
                  sortable={!filtering}
                  path={filtering ? pathOf(item.id) : undefined}
                  all={items}
                  busy={busy}
                  onToggle={() => {
                    const next = new Set(collapsed);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    remember(next);
                  }}
                  onMove={(kind) => void persist(({ up: moveUp, down: moveDown, indent, outdent })[kind](items, item.id))}
                  onAddChild={() => {
                    if (collapsed.has(item.id)) {
                      const next = new Set(collapsed);
                      next.delete(item.id);
                      remember(next);
                    }
                    setAdding(item.id);
                  }}
                  onMenu={(menu, inMenu) => {
                    setMenu(item.id, menu, inMenu);
                    void actions.setInMenu(item.id, menu, inMenu).then((res) => {
                      if (res.ok) showToast(inMenu ? `Added to the ${MENU_LABELS[menu]} menu` : `Removed from the ${MENU_LABELS[menu]} menu`);
                      else {
                        setMenu(item.id, menu, !inMenu);
                        showToast(res.error ?? "Could not change the menu", "error");
                      }
                    });
                  }}
                  onStatus={() =>
                    void act(() => (item.status === "PUBLISHED" ? actions.unpublish(item.id) : actions.publish(item.id)), item.status === "PUBLISHED" ? "Page unpublished" : "Page published", () =>
                      setStatus(item.id, item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"),
                    )
                  }
                  onPreview={() =>
                    void actions.preview(item.id).then((res) => {
                      if (res.ok && res.url) window.open(res.url, "_blank", "noopener,noreferrer");
                      else showToast(res.error ?? "Could not open the preview", "error");
                    })
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="mt-4 text-xs text-slate-400">Drag ⋮⋮ to reorder; drag sideways to move a page inside another. The arrows do the same with the keyboard or on a phone. The tree organises your pages only: page addresses (URLs) never change when you move a page.</p>
    </div>
  );
}
