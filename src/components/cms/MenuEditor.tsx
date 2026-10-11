"use client";

import { useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { saveMenu } from "@/app/admin/website/site-actions";
import type { MenuItemInput } from "@/lib/site/siteRules";

type Item = Omit<MenuItemInput, "children"> & { uid: string; heading?: boolean; children: Item[] };
export type PageOption = { group: string; labelEn: string; labelAr: string; url: string };
let counter = 0;
const uid = () => `m${++counter}-${Math.random().toString(36).slice(2, 7)}`;
const blank = (): Item => ({ uid: uid(), heading: false, labelEn: "", labelAr: "", url: "", visible: true, showDesktop: true, showMobile: true, newTab: false, children: [] });
export const toEditable = (items: MenuItemInput[]): Item[] => items.map((i) => ({ ...i, uid: uid(), heading: i.url === "", children: toEditable(i.children) as Item[] }));
const strip = (items: Item[]): MenuItemInput[] => items.map(({ uid: _u, heading: _h, children, ...rest }) => { void _u; void _h; return { ...rest, url: _h ? "" : rest.url, children: strip(children) }; });

function Row({ item, onChange, onRemove, extra, pages, top }: { item: Item; onChange: (i: Item) => void; onRemove: () => void; extra?: React.ReactNode; pages: PageOption[]; top?: boolean }) {
  const groups = [...new Set(pages.map((p) => p.group))];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
        <input className={inputClassName} placeholder="Label (English)" value={item.labelEn} onChange={(e) => onChange({ ...item, labelEn: e.target.value })} />
        <input className={inputClassName} dir="rtl" placeholder="العنوان بالعربية" value={item.labelAr} onChange={(e) => onChange({ ...item, labelAr: e.target.value })} />
        {top && item.heading ? (
          <p className="flex items-center rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No link: shows as a heading with a dropdown of its sub-items.</p>
        ) : (
        <div className="flex flex-col gap-1.5">
          <select
            className={inputClassName}
            aria-label="Choose a page"
            value=""
            onChange={(e) => {
              const p = pages.find((x) => x.url === e.target.value);
              if (p) onChange({ ...item, url: p.url, labelEn: item.labelEn || p.labelEn, labelAr: item.labelAr || p.labelAr });
            }}
          >
            <option value="">Choose a page…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {pages.filter((p) => p.group === g).map((p) => <option key={p.url} value={p.url}>{p.url.startsWith("#") ? `${p.labelEn} — dropdown of your service areas` : `${p.labelEn} (${p.url})`}</option>)}
              </optgroup>
            ))}
          </select>
          <input className={inputClassName} dir="ltr" placeholder="…or type /page or https://…" value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} />
        </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={item.visible} onChange={(e) => onChange({ ...item, visible: e.target.checked })} /> Visible</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={item.showDesktop} onChange={(e) => onChange({ ...item, showDesktop: e.target.checked })} /> Desktop</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={item.showMobile} onChange={(e) => onChange({ ...item, showMobile: e.target.checked })} /> Mobile</label>
        {top && (
          <label className="flex items-center gap-1.5 font-medium text-slate-800">
            <input type="checkbox" checked={!!item.heading} onChange={(e) => onChange({ ...item, heading: e.target.checked, url: e.target.checked ? "" : item.url })} /> No link, just a heading for sub-items
          </label>
        )}
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={item.newTab} onChange={(e) => onChange({ ...item, newTab: e.target.checked })} /> New tab</label>
        {extra}
        <button type="button" onClick={onRemove} className="ml-auto font-medium text-red-600">Remove</button>
      </div>
    </div>
  );
}

function Sortable({ item, onChange, onRemove, pages }: { item: Item; onChange: (i: Item) => void; onRemove: () => void; pages: PageOption[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= item.children.length) return;
    onChange({ ...item, children: arrayMove(item.children, i, j) });
  };
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }} className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex gap-2">
        <button type="button" aria-label="Drag to reorder" className="cursor-grab touch-none px-1 text-slate-400" {...attributes} {...listeners}>⠿</button>
        <div className="min-w-0 flex-1">
          <Row pages={pages} top item={item} onChange={onChange} onRemove={onRemove} extra={<button type="button" onClick={() => onChange({ ...item, children: [...item.children, blank()] })} className="font-medium text-blue-600">+ Sub-item</button>} />
          {item.children.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 border-s-2 border-slate-100 ps-3">
              {item.children.map((c, i) => (
                <div key={c.uid} className="flex gap-2">
                  <div className="flex flex-col text-xs text-slate-400">
                    <button type="button" aria-label="Move up" onClick={() => move(i, -1)}>▲</button>
                    <button type="button" aria-label="Move down" onClick={() => move(i, 1)}>▼</button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Row pages={pages} item={c} onChange={(nc) => onChange({ ...item, children: item.children.map((x) => (x.uid === c.uid ? { ...nc, children: [] } : x)) })} onRemove={() => onChange({ ...item, children: item.children.filter((x) => x.uid !== c.uid) })} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MenuEditor({ menu, title, initial, pages }: { menu: string; title: string; initial: MenuItemInput[]; pages: PageOption[] }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>(() => toEditable(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setItems((list) => arrayMove(list, list.findIndex((x) => x.uid === e.active.id), list.findIndex((x) => x.uid === e.over!.id)));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {items.length === 0 && <p className="text-sm text-slate-400">No items. The site falls back to its built-in links.</p>}
            {items.map((it) => (
              <Sortable key={it.uid} pages={pages} item={it} onChange={(n) => setItems((l) => l.map((x) => (x.uid === it.uid ? n : x)))} onRemove={() => setItems((l) => l.filter((x) => x.uid !== it.uid))} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => setItems((l) => [...l, blank()])} className="mt-3 text-sm font-medium text-blue-600">+ Add item</button>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await saveMenu(menu, strip(items));
              if (res.ok) showToast(`${title} saved.`);
              else setError(res.error ?? "Could not save.");
            })
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : `Save ${title.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}
