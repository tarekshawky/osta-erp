"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Copy, Download, GripVertical, Monitor, Plus, Smartphone, Undo2, Upload } from "lucide-react";
import { useToast } from "@/components/Toast";
import { saveMenu } from "@/app/admin/website/site-actions";
import { MENU_MAX_DEPTH } from "@/lib/site/menuTree";
import { menuProblem, isAutoUrl, type MenuItemInput } from "@/lib/site/siteRules";
import {
  AUTO_LABEL, MENU_TABS, TYPE_LABEL, addNode, canAutoFix, cloneNode, depthOf, duplicateNode, findNode, fixIssue, indentNode, menuIssues, moveSibling, outdentNode, pathTo, removeNode, toInput, toNodes, typeOf, updateNode,
  type Issue, type KnownLinks, type MenuNode,
} from "@/lib/site/menuModel";
import { AddItemDialog } from "./AddItemDialog";
import { EditPanel } from "./EditPanel";
import { MenuPreview, type PreviewData } from "./MenuPreview";
import type { PageOption } from "./PagePicker";

type Key = (typeof MENU_TABS)[number]["key"];

export type MenuManagerProps = {
  initial: Record<string, MenuItemInput[]>;
  pages: PageOption[];
  known: { live: string[]; drafts: string[]; prefixes: string[] };
  preview: PreviewData;
};

const TYPE_STYLE: Record<string, string> = { page: "bg-blue-50 text-blue-700", link: "bg-emerald-50 text-emerald-700", heading: "bg-violet-50 text-violet-700", button: "bg-indigo-100 text-indigo-800", auto: "bg-teal-50 text-teal-700" };
const iconBtn = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100";

type RowProps = {
  node: MenuNode; depth: number; selected: string | null; collapsed: ReadonlySet<string>; flagged: Map<string, Issue>; pageUrls: ReadonlySet<string>; autoCount: (url: string) => number;
  onSelect: (uid: string) => void; onToggle: (uid: string) => void; onPatch: (uid: string, patch: Partial<MenuNode>) => void; onAddChild: (uid: string) => void; onDuplicate: (uid: string) => void;
};

// One item = one line. Its sub-items follow underneath, indented, each again on one line.
function Row(p: RowProps) {
  const { node: n, depth } = p;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: n.uid });
  const type = typeOf(n, p.pageUrls);
  const issue = p.flagged.get(n.uid);
  const open = !p.collapsed.has(n.uid);
  const name = n.labelEn || n.labelAr || "New item";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div data-testid="menu-row" data-depth={depth} className={`flex h-12 items-center gap-1.5 rounded-xl border bg-white pe-1.5 ps-1 ${p.selected === n.uid ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"} ${n.visible ? "" : "opacity-60"}`}>
        <button type="button" aria-label={`Drag ${name}`} className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-slate-300" {...attributes} {...listeners}><GripVertical size={15} /></button>
        {n.children.length ? (
          <button type="button" aria-label={open ? `Collapse ${name}` : `Expand ${name}`} aria-expanded={open} onClick={() => p.onToggle(n.uid)} className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-500">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
        ) : <span className="w-6 shrink-0" />}
        <button type="button" onClick={() => p.onSelect(n.uid)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-start">
          <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold text-slate-900">{name}</span>{n.labelAr && n.labelEn && <span className="text-slate-400"> · <bdi dir="rtl">{n.labelAr}</bdi></span>}</span>
          {n.badgeEn && <span className="hidden shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 sm:inline">{n.badgeEn}</span>}
          {issue && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{issue.kind === "duplicate" ? "Duplicate" : issue.kind === "broken" ? "Broken link" : issue.kind === "draft" ? "Not published" : issue.kind === "depth" ? "Too deep" : "Incomplete"}</span>}
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline ${TYPE_STYLE[type]}`}>{TYPE_LABEL[type]}</span>
          <span className="hidden w-40 shrink-0 truncate font-mono text-[11px] text-slate-400 xl:inline" dir="ltr">{isAutoUrl(n.url) ? `auto · ${p.autoCount(n.url)} from ${AUTO_LABEL[n.url].source}` : n.url || "—"}</span>
        </button>
        <button type="button" aria-pressed={n.showDesktop} aria-label={`Show ${name} on desktop`} title="Desktop" onClick={() => p.onPatch(n.uid, { showDesktop: !n.showDesktop })} className={`${iconBtn} ${n.showDesktop ? "text-blue-600" : "text-slate-300"}`}><Monitor size={15} /></button>
        <button type="button" aria-pressed={n.showMobile} aria-label={`Show ${name} on mobile`} title="Mobile" onClick={() => p.onPatch(n.uid, { showMobile: !n.showMobile })} className={`${iconBtn} ${n.showMobile ? "text-blue-600" : "text-slate-300"}`}><Smartphone size={15} /></button>
        <button type="button" aria-label={`Add sub-item to ${name}`} title="Add sub-item" disabled={depth >= MENU_MAX_DEPTH} onClick={() => p.onAddChild(n.uid)} className={`${iconBtn} text-slate-500 disabled:opacity-20`}><Plus size={15} /></button>
        <button type="button" aria-label={`Duplicate ${name}`} title="Duplicate" onClick={() => p.onDuplicate(n.uid)} className={`${iconBtn} hidden text-slate-500 sm:flex`}><Copy size={14} /></button>
      </div>
      {n.children.length > 0 && open && <div className="ms-5 mt-1.5 border-s-2 border-slate-200 ps-3"><List {...p} nodes={n.children} depth={depth + 1} /></div>}
    </li>
  );
}

function List({ nodes, ...p }: Omit<RowProps, "node"> & { nodes: MenuNode[] }) {
  return (
    <SortableContext items={nodes.map((n) => n.uid)} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col gap-1.5">{nodes.map((n) => <Row key={n.uid} {...p} node={n} />)}</ul>
    </SortableContext>
  );
}

const snapshot = (t: MenuNode[]) => JSON.stringify(toInput(t));

// Where a dragged item lands: the sibling whose own LINE is nearest the pointer. An item with sub-items is much taller than its line, so judging by
// the middle of the whole block would drop things one place off.
const ROW_MIDDLE = 24;
const nearestSiblingRow: CollisionDetection = ({ active, droppableContainers, droppableRects, pointerCoordinates, collisionRect }) => {
  const y = pointerCoordinates?.y ?? collisionRect.top + ROW_MIDDLE;
  const list = active.data.current?.sortable?.containerId;
  return droppableContainers
    .filter((c) => c.data.current?.sortable?.containerId === list)
    .flatMap((c) => { const r = droppableRects.get(c.id); return r ? [{ id: c.id, data: { droppableContainer: c, value: Math.abs(r.top + ROW_MIDDLE - y) } }] : []; })
    .sort((a, b) => a.data.value - b.data.value);
};

export function MenuManager({ initial, pages, known, preview }: MenuManagerProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Key>("header");
  const [trees, setTrees] = useState<Record<string, MenuNode[]>>(() => Object.fromEntries(MENU_TABS.map((m) => [m.key, toNodes(initial[m.key] ?? [])])));
  const [saved, setSaved] = useState<Record<string, string>>(() => Object.fromEntries(MENU_TABS.map((m) => [m.key, snapshot(toNodes(initial[m.key] ?? []))])));
  const [history, setHistory] = useState<Record<string, MenuNode[][]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState<{ parent: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The box being typed in: further changes to it join the same undo step until the typing pauses.
  const typing = useRef<{ key: string; timer: number }>({ key: "", timer: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const tree = trees[tab];
  const meta = MENU_TABS.find((m) => m.key === tab)!;
  const links: KnownLinks = useMemo(() => ({ live: new Set(known.live), drafts: new Set(known.drafts), prefixes: known.prefixes }), [known]);
  const pageUrls = useMemo(() => new Set(pages.map((p) => p.url)), [pages]);
  const issues = useMemo(() => menuIssues(tree, links), [tree, links]);
  const flagged = useMemo(() => { const m = new Map<string, Issue>(); for (const i of issues) if (!m.has(i.uid)) m.set(i.uid, i); return m; }, [issues]);
  const dirty = (key: string) => snapshot(trees[key]) !== saved[key];
  const anyDirty = MENU_TABS.some((m) => dirty(m.key));
  const found = selected ? findNode(tree, selected) : null;
  const levels = depthOf(tree);

  useEffect(() => {
    if (!anyDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  // Every change goes through here so it can be undone. Typing in one box counts as one step.
  const change = (next: MenuNode[], key = "") => {
    const merge = !!key && typing.current.key === key;
    window.clearTimeout(typing.current.timer);
    typing.current = { key, timer: window.setTimeout(() => { typing.current.key = ""; }, 1500) };
    if (!merge) setHistory((h) => ({ ...h, [tab]: [...(h[tab] ?? []).slice(-49), tree] }));
    setTrees((t) => ({ ...t, [tab]: next }));
    setError(null);
  };
  const undo = () => {
    const stack = history[tab] ?? [];
    if (!stack.length) return;
    setTrees((t) => ({ ...t, [tab]: stack[stack.length - 1] }));
    setHistory((h) => ({ ...h, [tab]: stack.slice(0, -1) }));
    typing.current.key = "";
  };

  const reveal = (uid: string, in_: MenuNode[] = tree) => {
    const open = new Set(pathTo(in_, uid).slice(0, -1));
    setCollapsed((c) => new Set([...c].filter((x) => !open.has(x))));
    setSelected(uid);
  };
  const duplicate = (uid: string) => { const r = duplicateNode(tree, uid); change(r.tree); if (r.uid) setSelected(r.uid); };
  const remove = (uid: string) => {
    const f = findNode(tree, uid);
    if (!f) return;
    if (f.node.children.length && !window.confirm(`Delete “${f.node.labelEn || "this item"}” and its ${f.node.children.length} sub-item(s)? You can undo this before publishing.`)) return;
    change(removeNode(tree, uid)); setSelected(null);
  };
  const add = (node: MenuNode) => {
    const next = addNode(tree, node, adding?.parent ?? null);
    change(next); setAdding(null); reveal(node.uid, next);
  };
  const fix = (issue: Issue) => {
    if (canAutoFix(issue)) { change(fixIssue(tree, issue)); setSelected(null); showToast("Fixed. Publish the menu to make it live."); }
    else reveal(issue.uid);
  };

  const publish = () => {
    const items = toInput(tree);
    const problem = menuProblem(items);
    if (problem) { setError(problem); const first = issues.find((i) => i.kind === "incomplete" || i.kind === "broken"); if (first) reveal(first.uid); return; }
    const sent = snapshot(tree);
    const key = tab, label = meta.label;
    startTransition(async () => {
      const res = await saveMenu(key, items);
      if (res.ok) { setSaved((s) => ({ ...s, [key]: sent })); setError(null); showToast(`${label} menu published.`); }
      else setError(res.error ?? "Could not publish.");
    });
  };

  const copyFrom = (from: string) => {
    if (!from) return;
    if (tree.length && !window.confirm(`Replace this menu with a copy of the ${MENU_TABS.find((m) => m.key === from)!.label} menu? You can undo this before publishing.`)) return;
    change(trees[from].map(cloneNode)); setSelected(null);
  };
  const exportMenu = () => {
    const blob = new Blob([JSON.stringify({ menu: tab, items: toInput(tree) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `osta-menu-${tab}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };
  const importMenu = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { items?: MenuItemInput[] };
      if (!Array.isArray(data.items)) throw new Error("no items");
      const nodes = toNodes(data.items);
      const problem = menuProblem(toInput(nodes));
      if (problem) { setError(`The file was not imported: ${problem}`); return; }
      if (tree.length && !window.confirm("Replace this menu with the one in the file? You can undo this before publishing.")) return;
      change(nodes); setSelected(null);
    } catch { setError("That file is not a menu export."); }
  };

  const onDragEnd = (e: DragEndEvent) => { if (e.over && e.active.id !== e.over.id) change(moveSibling(tree, String(e.active.id), String(e.over.id))); };
  const autoCount = (url: string) => (url === "#areas" ? preview.areas.length : preview.services.length);
  const count = (k: IssueGroup) => issues.filter((i) => (k === "link" ? i.kind === "broken" || i.kind === "draft" : i.kind === k));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Menus" className="flex flex-wrap gap-2">
          {MENU_TABS.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={tab === m.key} onClick={() => { setTab(m.key); setSelected(null); setError(null); }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === m.key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
              {m.label}{dirty(m.key) && <span aria-label="not published" title="Changes not published" className="ms-1.5 inline-block h-2 w-2 rounded-full bg-orange-500" />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={undo} disabled={!(history[tab]?.length)} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Undo2 size={14} /> Undo</button>
          <select aria-label="Copy from another menu" value="" onChange={(e) => copyFrom(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Copy from…</option>
            {MENU_TABS.filter((m) => m.key !== tab).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Upload size={14} /> Import</button>
          <button type="button" onClick={exportMenu} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Download size={14} /> Export</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importMenu(f); e.target.value = ""; }} />
          <button type="button" onClick={publish} disabled={pending || !dirty(tab)} className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"><Check size={15} /> {pending ? "Publishing…" : "Publish menu"}</button>
        </div>
      </div>
      <p className="text-xs text-slate-500">{meta.note} Click a line to edit it. Drag to reorder items on the same level. Nothing changes on the website until you press Publish menu.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <MenuPreview key={tab} menu={tab} nodes={tree} selected={selected} data={preview} known={links} onSelect={(uid) => reveal(uid)} />
          <div>
            <DndContext id="menu-dnd" sensors={sensors} collisionDetection={nearestSiblingRow} onDragEnd={onDragEnd}>
              <List nodes={tree} depth={1} selected={selected} collapsed={collapsed} flagged={flagged} pageUrls={pageUrls} autoCount={autoCount}
                onSelect={(uid) => setSelected(uid)} onToggle={(uid) => setCollapsed((c) => { const n = new Set(c); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; })}
                onPatch={(uid, patch) => change(updateNode(tree, uid, patch))} onAddChild={(uid) => setAdding({ parent: uid })} onDuplicate={duplicate} />
            </DndContext>
            {!tree.length && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">No items. {tab === "mobile" ? "Phones use the Header menu." : "The website uses its built-in links."}</p>}
            <button type="button" onClick={() => setAdding({ parent: null })} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-bold text-slate-700 hover:border-blue-400"><Plus size={16} /> Add item <span className="font-normal text-slate-400">Page · Link · Dropdown · Button · Auto list</span></button>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {found && (
            <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[75vh] max-lg:overflow-y-auto max-lg:shadow-2xl">
              <EditPanel key={found.node.uid} found={found} tree={tree} pages={pages} pageUrls={pageUrls}
                onPatch={(patch, field) => change(updateNode(tree, found.node.uid, patch), `${found.node.uid}:${field}`)}
                onDone={() => setSelected(null)} onDuplicate={() => duplicate(found.node.uid)} onDelete={() => remove(found.node.uid)}
                onMove={(by) => { const to = found.siblings[found.index + by]; if (to) change(moveSibling(tree, found.node.uid, to.uid)); }}
                onIndent={() => { const n = indentNode(tree, found.node.uid); change(n); reveal(found.node.uid, n); }}
                onOutdent={() => change(outdentNode(tree, found.node.uid))} />
            </div>
          )}
          {!found && <p className="hidden rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 lg:block">Click a line in the menu to edit it.</p>}

          <section aria-label="Menu health" className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-900">Menu health</h3>
            <ul className="flex flex-col gap-1.5">
              {([["duplicate", "duplicate item"], ["link", "broken link"], ["depth", "item too deep"], ["incomplete", "unfinished item"]] as const).map(([k, word]) => {
                const list = count(k);
                if (!list.length) {
                  const ok = k === "duplicate" ? "No duplicate items" : k === "link" ? "No broken links" : k === "depth" ? `Depth: ${levels} level${levels === 1 ? "" : "s"} (max ${MENU_MAX_DEPTH})` : null;
                  return ok ? <li key={k} className="flex items-center gap-2 text-sm text-slate-600"><Check size={15} className="text-emerald-600" /> {ok}</li> : null;
                }
                return (
                  <li key={k}>
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={15} /> {list.length} {word}{list.length > 1 ? "s" : ""}</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {list.slice(0, 8).map((i) => (
                        <li key={`${i.uid}-${i.kind}`} className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-slate-700">
                          <span className="min-w-0 break-words">{i.message}</span>
                          <button type="button" onClick={() => fix(i)} title={canAutoFix(i) ? (i.kind === "duplicate" ? "Remove the second copy" : "Move it up to level 3") : "Open the item to correct it"} className="shrink-0 rounded-md bg-white px-2 py-1 font-bold text-blue-700 shadow-sm">Fix</button>
                        </li>
                      ))}
                      {list.length > 8 && <li className="text-xs text-slate-400">…and {list.length - 8} more.</li>}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-slate-400">Links to other websites, phone numbers and emails are not checked.</p>
          </section>
        </aside>
      </div>

      {adding && (
        <AddItemDialog
          title={adding.parent ? `Add under “${findNode(tree, adding.parent)?.node.labelEn || "item"}”` : `Add to ${meta.label} menu`}
          pages={pages} autoAllowed={!adding.parent} used={new Set(tree.map((n) => n.url).filter(isAutoUrl))} onAdd={add} onClose={() => setAdding(null)} />
      )}
    </div>
  );
}

type IssueGroup = "duplicate" | "link" | "depth" | "incomplete";
