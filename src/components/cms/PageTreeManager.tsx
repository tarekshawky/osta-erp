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
  applyMove, canIndent, changedRows, descendantIds, flatten, getProjection, indent, moveDown, moveToParent, moveUp, outdent, parentOptions,
  type Flat,
} from "@/lib/cms/pageTree";

export type TreePage = {
  id: string; parentId: string | null; sortOrder: number;
  titleEn: string; titleAr: string; slug: string; status: string; type: string; isHomepage: boolean; builtIn: boolean; score: number;
  updatedAt: string; // ISO date
  menus: string[]; // keys of the navigation menus that link to this page
};
type Result = { ok: boolean; error?: string };
export type TreeActions = {
  saveLayout: (rows: { id: string; parentId: string | null; sortOrder: number }[]) => Promise<Result>;
  setInMenu: (pageId: string, menu: string, inMenu: boolean) => Promise<Result>;
  publish: (pageId: string) => Promise<Result>;
  unpublish: (pageId: string) => Promise<Result>;
  preview: (pageId: string) => Promise<Result & { url?: string }>;
  duplicate: (pageId: string) => Promise<Result & { id?: string }>;
  remove: (pageId: string) => Promise<Result>;
  setParent: (pageId: string, parentId: string | null) => Promise<Result>;
  // Called after a page was duplicated or deleted so the screen can reload from the server.
  refresh: () => void;
};

const INDENT = 28;
const COLLAPSED_KEY = "osta:structure:collapsed";
export const MENU_LABELS: Record<string, { label: string; hint: string }> = {
  header: { label: "Main Header Navigation", hint: "Show in top navigation bar" },
  services: { label: "Services Dropdown", hint: "Under Services menu (footer column)" },
  locations: { label: "Locations Dropdown", hint: "Under Locations menu (footer column)" },
  footer: { label: "Footer Navigation", hint: "Show in footer quick links" },
  mobile: { label: "Mobile Navigation", hint: "Mobile menu (hamburger)" },
};
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700", DRAFT: "bg-slate-100 text-slate-600", SCHEDULED: "bg-amber-50 text-amber-700", ARCHIVED: "bg-slate-100 text-slate-400",
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: "Published", DRAFT: "Draft", SCHEDULED: "Scheduled", ARCHIVED: "Archived" };
const typeLabel = (p: Pick<TreePage, "type" | "builtIn" | "isHomepage">) => (p.isHomepage || p.builtIn ? "Built-in" : p.type.charAt(0).toUpperCase() + p.type.slice(1));
// What "add a page under this one" is called, depending on the parent's type.
const addLabel = (parentType: string) => (parentType === "service" ? { text: "Add Service Page", type: "service" } : parentType === "area" ? { text: "Add Location", type: "area" } : { text: "Add Sub-page", type: "page" });

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

type RowProps = {
  item: Flat<TreePage>; depth: number; expanded: boolean; dragging: boolean; selected: boolean; sortable: boolean; path?: string;
  all: TreePage[]; busy: boolean;
  onSelect: () => void; onToggle: () => void; onMove: (kind: "up" | "down" | "indent" | "outdent") => void;
  onAddChild: () => void; onStatus: () => void; onPreview: () => void; onDuplicate: () => void; onDelete: () => void; onMoveTo: () => void;
};

function Row({ item, depth, expanded, dragging, selected, sortable, path, all, busy, onSelect, onToggle, onMove, onAddChild, onStatus, onPreview, onDuplicate, onDelete, onMoveTo }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !sortable });
  const published = item.status === "PUBLISHED";
  const icon = item.isHomepage ? "🏠" : item.hasChildren ? (expanded ? "📂" : "📁") : "📄";
  const url = item.isHomepage ? "/" : `/${item.slug}`;
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menuRef.current?.removeAttribute("open");
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, paddingInlineStart: depth * INDENT }} className={isDragging ? "relative z-10 opacity-60" : ""}>
      <div
        onClick={(e) => {
          // A click on the row selects it and opens/closes its sub-pages; links, buttons and fields keep their own behaviour.
          if ((e.target as HTMLElement).closest("a,button,input,select,summary,label,details")) return;
          onSelect();
          if (item.hasChildren) onToggle();
        }}
        className={`flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border px-2 py-2 2xl:flex-nowrap ${dragging ? "border-blue-300 bg-blue-50" : selected ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
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
        <span className="hidden w-16 shrink-0 text-xs text-slate-500 2xl:inline">{typeLabel(item)}</span>
        <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${scoreStyle(item.score)}`} title="SEO score">{item.score}</span>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label="Move up" onClick={() => onMove("up")} disabled={busy}>↑</IconBtn>
          <IconBtn label="Move down" onClick={() => onMove("down")} disabled={busy}>↓</IconBtn>
          <IconBtn label="Move out one level" onClick={() => onMove("outdent")} disabled={busy || !item.parentId}>⇤</IconBtn>
          <IconBtn label="Move in one level (under the page above)" onClick={() => onMove("indent")} disabled={busy || !canIndent(all, item.id)}>⇥</IconBtn>
          <Link href={`/admin/website/pages/${item.id}`} aria-label={`Edit ${item.titleEn}`} title="Edit" className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50">✎</Link>
          <details ref={menuRef} className="relative">
            <summary aria-label={`More actions for ${item.titleEn}`} title="More actions" className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">⋯</summary>
            <div className="absolute end-0 top-8 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg" onClick={closeMenu}>
              <button type="button" onClick={onAddChild} className="block w-full rounded px-2 py-1.5 text-start text-slate-700 hover:bg-slate-50">+ Sub-page</button>
              <button type="button" onClick={onPreview} className="block w-full rounded px-2 py-1.5 text-start text-slate-700 hover:bg-slate-50">Preview</button>
              {!item.isHomepage && <button type="button" disabled={busy} onClick={onStatus} className="block w-full rounded px-2 py-1.5 text-start text-slate-700 hover:bg-slate-50 disabled:opacity-50">{published ? "Unpublish" : "Publish"}</button>}
              <button type="button" disabled={busy} onClick={onDuplicate} className="block w-full rounded px-2 py-1.5 text-start text-slate-700 hover:bg-slate-50 disabled:opacity-50">Duplicate</button>
              <button type="button" onClick={onMoveTo} className="block w-full rounded px-2 py-1.5 text-start text-slate-700 hover:bg-slate-50">Move to…</button>
              {!item.isHomepage && <button type="button" disabled={busy} onClick={onDelete} className="block w-full rounded px-2 py-1.5 text-start text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>}
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}

// The side panel for the selected page: details, navigation menus and quick actions.
function DetailsPanel({ page, items, busy, moveRef, onMenu, onStatus, onPreview, onDuplicate, onDelete, onSetParent }: {
  page: TreePage | null; items: TreePage[]; busy: boolean; moveRef: React.RefObject<HTMLSelectElement | null>;
  onMenu: (menu: string, inMenu: boolean) => void; onStatus: () => void; onPreview: () => void; onDuplicate: () => void; onDelete: () => void; onSetParent: (parentId: string | null) => void;
}) {
  if (!page) {
    return (
      <aside className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
        <p className="text-base font-semibold text-slate-500">Page details</p>
        <p className="mt-2">Click a page in the tree to see its details, menus and quick actions here.</p>
      </aside>
    );
  }
  const parent = page.parentId ? items.find((i) => i.id === page.parentId) : null;
  const choices = parentOptions(items, page.id);
  const published = page.status === "PUBLISHED";
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words text-slate-900">{value}</dd></div>
  );
  return (
    <aside className="flex flex-col gap-4" aria-label="Page details">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Page Details</h3>
          <Link href={`/admin/website/pages/${page.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">✎ Edit</Link>
        </div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{page.titleEn}</p>
            <p className="truncate font-mono text-xs text-slate-400">{page.isHomepage ? "/" : `/${page.slug}`}</p>
            <p className="text-xs text-slate-400">{typeLabel(page)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[page.status] ?? ""}`}>{STATUS_LABEL[page.status] ?? page.status}</span>
        </div>
        <dl className="divide-y divide-slate-100 border-t border-slate-100">
          {row("Title (English)", page.titleEn)}
          {row("Title (Arabic)", <span dir="rtl">{page.titleAr}</span>)}
          {row("URL slug", <span className="font-mono text-xs">{page.isHomepage ? "/" : `/${page.slug}`}</span>)}
          {row("Parent page", parent ? <span className="text-blue-600">{parent.titleEn}</span> : <span className="text-slate-400">None (top level)</span>)}
          {row("Page type", typeLabel(page))}
          {row("Status", STATUS_LABEL[page.status] ?? page.status)}
          {row("SEO score", <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreStyle(page.score)}`}>{page.score}</span>)}
          {row("Last updated", page.updatedAt.slice(0, 16).replace("T", " "))}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Navigation Menus</h3>
          <Link href="/admin/website/menus" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-slate-50">Manage Menus</Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {Object.entries(MENU_LABELS).map(([key, m]) => {
            const included = page.menus.includes(key);
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-3 py-2">
                  <input type="checkbox" checked={included} disabled={busy} onChange={(e) => onMenu(key, e.target.checked)} className="h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{m.label}</span>
                    <span className="block text-xs text-slate-400">{m.hint}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${included ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{included ? "Included" : "Not included"}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-slate-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button type="button" onClick={onPreview} className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Preview Page</button>
          {page.isHomepage ? <span /> : (
            <button type="button" disabled={busy} onClick={onStatus} className={`rounded-lg px-3 py-2 font-semibold disabled:opacity-50 ${published ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{published ? "Unpublish" : "Publish"}</button>
          )}
          <button type="button" disabled={busy} onClick={onDuplicate} className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Duplicate</button>
          {page.isHomepage ? <span /> : (
            <button type="button" disabled={busy} onClick={onDelete} className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
          )}
        </div>
        <label className="mt-3 flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Move page</span>
          <select ref={moveRef} className={inputClassName} value={page.parentId ?? ""} disabled={busy} onChange={(e) => onSetParent(e.target.value || null)} aria-label="Move page under">
            <option value="">— Top level —</option>
            {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <span className="text-xs text-slate-400">Moves the page and its sub-pages. The page address never changes.</span>
        </label>
      </section>
    </aside>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ parentId: string | null; type: string } | null>(null);
  const moveRef = useRef<HTMLSelectElement>(null);

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
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

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

  // For each expanded parent, the row after which its "Add …" shortcut goes (below its last visible sub-page).
  const shortcuts = useMemo(() => {
    const map = new Map<string, Flat<TreePage>[]>();
    if (filtering || activeId) return map;
    visible.forEach((p, i) => {
      if (!p.hasChildren || collapsed.has(p.id)) return;
      let last = i;
      for (let j = i + 1; j < visible.length && visible[j].depth > p.depth; j++) last = j;
      const key = visible[last].id;
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    for (const list of map.values()) list.sort((a, b) => b.depth - a.depth); // innermost first
    return map;
  }, [visible, collapsed, filtering, activeId]);

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
  const toggleStatus = (p: TreePage) =>
    void act(() => (p.status === "PUBLISHED" ? actions.unpublish(p.id) : actions.publish(p.id)), p.status === "PUBLISHED" ? "Page unpublished" : "Page published", () => setStatus(p.id, p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"));
  const setMenu = (id: string, menu: string, inMenu: boolean) => {
    const f = (list: TreePage[]) => list.map((i) => (i.id === id ? { ...i, menus: inMenu ? [...new Set([...i.menus, menu])] : i.menus.filter((m) => m !== menu) } : i));
    setItems(f);
    saved.current = f(saved.current);
  };
  const changeMenu = (p: TreePage, menu: string, inMenu: boolean) => {
    setMenu(p.id, menu, inMenu);
    void actions.setInMenu(p.id, menu, inMenu).then((res) => {
      if (res.ok) showToast(inMenu ? `Added to the ${MENU_LABELS[menu].label}` : `Removed from the ${MENU_LABELS[menu].label}`);
      else {
        setMenu(p.id, menu, !inMenu);
        showToast(res.error ?? "Could not change the menu", "error");
      }
    });
  };
  const preview = (p: TreePage) =>
    void actions.preview(p.id).then((res) => {
      if (res.ok && res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else showToast(res.error ?? "Could not open the preview", "error");
    });
  const duplicate = (p: TreePage) => void act(() => actions.duplicate(p.id), "Page duplicated", () => actions.refresh());
  const remove = (p: TreePage) => {
    const kids = items.filter((i) => i.parentId === p.id).length;
    const msg = `Delete “${p.titleEn}”?${kids ? ` Its ${kids} sub-page(s) move up one level.` : ""} ${p.status === "PUBLISHED" ? "Visitors of its address are sent to its parent page. " : ""}Only an administrator can bring it back.`;
    if (!window.confirm(msg)) return;
    void act(() => actions.remove(p.id), "Page deleted", () => {
      setSelectedId(null);
      actions.refresh();
    });
  };
  const setParent = (p: TreePage, parentId: string | null) => {
    const next = moveToParent(items, p.id, parentId);
    setBusy(true);
    void actions.setParent(p.id, parentId).then((res) => {
      setBusy(false);
      if (res.ok) {
        setItems(next);
        saved.current = next;
        showToast("Page moved");
        if (parentId && collapsed.has(parentId)) {
          const c = new Set(collapsed);
          c.delete(parentId);
          remember(c);
        }
      } else showToast(res.error ?? "Could not move the page", "error");
    });
  };
  const openAdd = (parent: TreePage) => {
    if (collapsed.has(parent.id)) {
      const next = new Set(collapsed);
      next.delete(parent.id);
      remember(next);
    }
    setAdding({ parentId: parent.id, type: addLabel(parent.type).type });
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
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
          <button type="button" onClick={() => setAdding({ parentId: null, type: "page" })} className="ms-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ New page</button>
        </div>

        {adding && (
          <NewPageForm key={`${adding.parentId}-${adding.type}`} startOpen parents={parents} defaultParentId={adding.parentId ?? ""} defaultType={adding.type} onCancel={() => setAdding(null)} />
        )}

        {filtering && <p className="mb-3 text-xs text-slate-500">Showing search results as a flat list. Clear the search and filter to drag pages and change the structure.</p>}

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">{items.length === 0 ? "No pages yet. Create your first one." : "No pages match."}</p>
        ) : (
          <DndContext id="page-tree" sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={resetDrag}>
            <SortableContext items={visible.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-1.5" aria-label="Website pages">
                {visible.flatMap((item) => {
                  const row = (
                    <Row
                      key={item.id}
                      item={item}
                      depth={item.id === activeId && projection ? projection.depth : item.depth}
                      expanded={!collapsed.has(item.id)}
                      dragging={item.id === activeId}
                      selected={item.id === selectedId}
                      sortable={!filtering}
                      path={filtering ? pathOf(item.id) : undefined}
                      all={items}
                      busy={busy}
                      onSelect={() => setSelectedId(item.id)}
                      onToggle={() => {
                        const next = new Set(collapsed);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        remember(next);
                      }}
                      onMove={(kind) => void persist(({ up: moveUp, down: moveDown, indent, outdent })[kind](items, item.id))}
                      onAddChild={() => openAdd(item)}
                      onStatus={() => toggleStatus(item)}
                      onPreview={() => preview(item)}
                      onDuplicate={() => duplicate(item)}
                      onDelete={() => remove(item)}
                      onMoveTo={() => {
                        setSelectedId(item.id);
                        window.setTimeout(() => moveRef.current?.focus(), 50);
                      }}
                    />
                  );
                  const adds = (shortcuts.get(item.id) ?? []).map((parent) => (
                    <li key={`add-${parent.id}`} style={{ paddingInlineStart: (parent.depth + 1) * INDENT + 36 }}>
                      <button type="button" onClick={() => openAdd(parent)} className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                        ＋ {addLabel(parent.type).text}
                      </button>
                    </li>
                  ));
                  return [row, ...adds];
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <p className="mt-4 text-xs text-slate-400">Click a page to open or close its sub-pages and see its details. Drag ⋮⋮ to reorder; drag sideways to move a page inside another. The arrows do the same with the keyboard or on a phone. The tree organises your pages only: page addresses (URLs) never change when you move a page.</p>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <DetailsPanel
          page={selected}
          items={items}
          busy={busy}
          moveRef={moveRef}
          onMenu={(menu, inMenu) => selected && changeMenu(selected, menu, inMenu)}
          onStatus={() => selected && toggleStatus(selected)}
          onPreview={() => selected && preview(selected)}
          onDuplicate={() => selected && duplicate(selected)}
          onDelete={() => selected && remove(selected)}
          onSetParent={(parentId) => selected && setParent(selected, parentId)}
        />
      </div>
    </div>
  );
}
