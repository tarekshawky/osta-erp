"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { FieldEditor } from "@/components/cms/BlockForm";
import { BLOCK_REGISTRY, BLOCK_TYPES, createBlock, newBlockId, type Block, type BlockType } from "@/lib/cms/blocks";
import { SeoPanel, type Analysis } from "@/components/cms/SeoPanel";
import { analyzeDraft, createPreviewUrl, deletePage, duplicatePage, publishPage, restoreVersion, saveDraft, unpublishPage, type SeoInput } from "@/app/admin/website/actions";

export type VersionRow = { id: string; version: number; kind: string; by: string; at: string };
export type BuilderPage = {
  id: string;
  status: string;
  publishAt: string | null;
  publishedSlug: string | null;
  titleEn: string;
  titleAr: string;
  slug: string;
  type: string;
  showInMenus: boolean;
  showInSitemap: boolean;
  showLastUpdated: boolean;
  areaName: string | null;
  isHomepage: boolean;
  blocks: Block[];
  seo: SeoInput;
};

type Draft = Pick<BuilderPage, "titleEn" | "titleAr" | "slug" | "type" | "showInMenus" | "showInSitemap" | "showLastUpdated" | "blocks" | "seo">;
type SaveState = "saved" | "dirty" | "saving" | "error";

const blockSummary = (b: Block): string => {
  const heading = (b.props.heading as { en?: string } | undefined)?.en;
  return heading?.trim() || "";
};

function SortableBlock({
  block, open, onToggleOpen, onChange, onRemove, onDuplicate,
}: {
  block: Block; open: boolean; onToggleOpen: () => void; onChange: (b: Block) => void; onRemove: () => void; onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const reg = BLOCK_REGISTRY[block.type];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`rounded-xl border bg-white ${block.hidden ? "border-dashed border-slate-300" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" aria-label="Drag to reorder" className="cursor-grab touch-none px-1 text-slate-400" {...attributes} {...listeners}>
          ⠿
        </button>
        <button type="button" onClick={onToggleOpen} className="flex flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <span className="text-sm font-semibold text-slate-900">{reg.label}</span>
          <span className="truncate text-xs text-slate-400">{blockSummary(block)}</span>
          {block.hidden && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">hidden</span>}
        </button>
        <button type="button" onClick={() => onChange({ ...block, hidden: !block.hidden })} className="text-xs font-medium text-slate-600">
          {block.hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onDuplicate} className="text-xs font-medium text-slate-600">
          Duplicate
        </button>
        <button type="button" onClick={onRemove} className="text-xs font-medium text-red-600">
          Delete
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.visibility.desktop} onChange={(e) => onChange({ ...block, visibility: { ...block.visibility, desktop: e.target.checked } })} />
              Show on desktop
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={block.visibility.mobile} onChange={(e) => onChange({ ...block, visibility: { ...block.visibility, mobile: e.target.checked } })} />
              Show on mobile
            </label>
          </div>
          <FieldEditor fields={reg.fields} value={block.props} onChange={(props) => onChange({ ...block, props })} />
        </div>
      )}
    </div>
  );
}

export function PageBuilder({ page, versions, siteOrigin }: { page: BuilderPage; versions: VersionRow[]; siteOrigin: string }) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<Draft>({
    titleEn: page.titleEn, titleAr: page.titleAr, slug: page.slug, type: page.type, showInMenus: page.showInMenus,
    showInSitemap: page.showInSitemap, showLastUpdated: page.showLastUpdated, blocks: page.blocks, seo: page.seo,
  });
  const [status, setStatus] = useState(page.status);
  const [publishAt, setPublishAt] = useState(page.publishAt ? page.publishAt.slice(0, 16) : "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [adding, setAdding] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pending, startTransition] = useTransition();

  const serialized = useMemo(() => JSON.stringify(draft), [draft]);
  const lastSaved = useRef(serialized);
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const persist = useCallback(
    async (autosave: boolean): Promise<boolean> => {
      const snapshot = JSON.stringify(latest.current);
      setSaveState("saving");
      const res = await saveDraft(page.id, latest.current, autosave);
      if (res.ok) {
        lastSaved.current = snapshot;
        setSaveState(JSON.stringify(latest.current) === snapshot ? "saved" : "dirty");
        return true;
      }
      setSaveState("error");
      if (!autosave) showToast(res.error ?? "Could not save.", "error");
      return false;
    },
    [page.id, showToast]
  );

  // Autosave the working draft 3s after the last edit (no history row; "Save" makes a version).
  useEffect(() => {
    if (serialized === lastSaved.current) return;
    const timer = setTimeout(() => void persist(true), 3000);
    return () => clearTimeout(timer);
  }, [serialized, persist]);

  // Live SEO checks against the current (even unsaved) draft.
  useEffect(() => {
    const timer = setTimeout(() => void analyzeDraft(page.id, latest.current).then(setAnalysis).catch(() => {}), 1200);
    return () => clearTimeout(timer);
  }, [serialized, page.id]);

  // Unsaved-changes guard.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== lastSaved.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaveState("dirty");
  };
  const setBlocks = (blocks: Block[]) => update({ blocks });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = draft.blocks.findIndex((b) => b.id === e.active.id);
    const to = draft.blocks.findIndex((b) => b.id === e.over!.id);
    setBlocks(arrayMove(draft.blocks, from, to));
  }

  function addBlock(type: BlockType) {
    const b = createBlock(type);
    setBlocks([...draft.blocks, b]);
    setOpenId(b.id);
    setAdding(false);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) {
    startTransition(async () => {
      if (JSON.stringify(latest.current) !== lastSaved.current && !(await persist(true))) return;
      const res = await fn();
      if (res.ok) {
        showToast(success);
        after?.();
      } else showToast(res.error ?? "Something went wrong.", "error");
    });
  }

  async function publishWithCheck() {
    const result = await analyzeDraft(page.id, latest.current);
    setAnalysis(result);
    const errors = result.issues.filter((i) => i.severity === "error");
    if (errors.length && !confirm(`${errors.length} SEO problem${errors.length === 1 ? "" : "s"} found:\n\n• ${errors.slice(0, 4).map((e) => e.message).join("\n• ")}\n\nPublish anyway?`)) return;
    run(() => publishPage(page.id, null), "Published.", () => setStatus("PUBLISHED"));
  }

  const SAVE_LABEL: Record<SaveState, string> = { saved: "All changes saved", dirty: "Unsaved changes…", saving: "Saving…", error: "Autosave failed" };
  const seo = draft.seo;
  const setSeo = (patch: Partial<SeoInput>) => update({ seo: { ...seo, ...patch } });
  const frameWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/website/pages" onClick={(e) => { if (JSON.stringify(latest.current) !== lastSaved.current && !confirm("You have unsaved changes. Leave anyway?")) e.preventDefault(); }} className="text-sm text-slate-500">
            ← Pages
          </Link>
          <span className={`text-xs ${saveState === "error" ? "text-red-500" : "text-slate-400"}`} aria-live="polite">{SAVE_LABEL[saveState]}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => createPreviewUrl(page.id).then((r) => { if (r.ok && r.url) setPreviewUrl(r.url); return r; }), "Preview ready.")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
            Preview
          </button>
          <button type="button" disabled={pending || saveState === "saving"} onClick={() => startTransition(async () => { if (await persist(false)) showToast("Saved."); })} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50">
            Save
          </button>
          <button type="button" disabled={pending} onClick={() => void publishWithCheck()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Publish
          </button>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title (English) *">
              <input className={inputClassName} value={draft.titleEn} onChange={(e) => update({ titleEn: e.target.value })} />
            </Field>
            <Field label="العنوان (Arabic) *" dir="rtl">
              <input className={inputClassName} dir="rtl" value={draft.titleAr} onChange={(e) => update({ titleAr: e.target.value })} />
            </Field>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draft.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {draft.blocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No blocks yet. Add your first block below.</p>}
                {draft.blocks.map((b) => (
                  <SortableBlock
                    key={b.id}
                    block={b}
                    open={openId === b.id}
                    onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
                    onChange={(nb) => setBlocks(draft.blocks.map((x) => (x.id === b.id ? nb : x)))}
                    onRemove={() => { if (confirm("Delete this block?")) setBlocks(draft.blocks.filter((x) => x.id !== b.id)); }}
                    onDuplicate={() => {
                      const i = draft.blocks.findIndex((x) => x.id === b.id);
                      const copy: Block = { ...structuredClone(b), id: newBlockId() };
                      setBlocks([...draft.blocks.slice(0, i + 1), copy, ...draft.blocks.slice(i + 1)]);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {adding ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
              {BLOCK_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => addBlock(t)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50">
                  <p className="text-sm font-semibold text-slate-900">{BLOCK_REGISTRY[t].label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{BLOCK_REGISTRY[t].description}</p>
                </button>
              ))}
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500 sm:col-span-2">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600">
              + Add block
            </button>
          )}

          {previewUrl && (
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-2">
                  {(["desktop", "tablet", "mobile"] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${device === d ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 text-xs">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600">Open in new tab</a>
                  <button type="button" onClick={() => setPreviewUrl(null)} className="text-slate-500">Close</button>
                </div>
              </div>
              <div className="overflow-x-auto bg-slate-100 p-2">
                <iframe title="Preview" src={previewUrl} style={{ width: frameWidth, height: 640 }} className="mx-auto block rounded-lg border border-slate-200 bg-white" />
              </div>
              <p className="mt-2 text-xs text-slate-400">Shows your saved draft. The link expires after 15 minutes.</p>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">Page settings</h3>
            <div className="flex flex-col gap-3">
              <Field label="Slug (URL)">
                <input className={inputClassName} dir="ltr" value={page.isHomepage ? "/ (homepage)" : draft.slug} disabled={page.isHomepage} onChange={(e) => update({ slug: e.target.value })} />
              </Field>
              {page.publishedSlug && page.publishedSlug !== draft.slug && <p className="text-xs text-amber-600">Live at /{page.publishedSlug} until you publish. A redirect is added automatically.</p>}
              <Field label="Type">
                <select className={inputClassName} value={draft.type} disabled={page.isHomepage} onChange={(e) => update({ type: e.target.value })}>
                  {["page", "service", "area", "article", "landing"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.showInMenus} onChange={(e) => update({ showInMenus: e.target.checked })} /> Show in the navigation bar (pages of type “page”, once published)</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.showInSitemap} onChange={(e) => update({ showInSitemap: e.target.checked })} /> Include in sitemap</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.showLastUpdated} onChange={(e) => update({ showLastUpdated: e.target.checked })} /> Show “last updated” date</label>
              {page.areaName && <p className="text-xs text-slate-500">Service area: <b>{page.areaName}</b></p>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">Publishing</h3>
            {status === "SCHEDULED" && page.publishAt && <p className="mb-2 text-xs text-amber-600">Scheduled for {page.publishAt.slice(0, 16).replace("T", " ")} UTC</p>}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Schedule for (optional)</span>
              <input type="datetime-local" className={inputClassName} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={pending || !publishAt} onClick={() => run(() => publishPage(page.id, new Date(publishAt).toISOString()), "Scheduled.", () => setStatus("SCHEDULED"))} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50">
                Schedule
              </button>
              {(status === "PUBLISHED" || status === "SCHEDULED") && (
                <button type="button" disabled={pending} onClick={() => run(() => unpublishPage(page.id), "Taken offline.", () => setStatus("DRAFT"))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                  Unpublish
                </button>
              )}
            </div>
          </section>

          <SeoPanel seo={seo} setSeo={setSeo} titleEn={draft.titleEn} titleAr={draft.titleAr} slug={draft.slug} origin={siteOrigin} analysis={analysis} />

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">History</h3>
            {versions.length === 0 && <p className="text-xs text-slate-400">No saved versions yet. Click Save to create one.</p>}
            <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    <b>v{v.version}</b> {v.kind.toLowerCase()} · {v.by} · {v.at}
                  </span>
                  <button type="button" disabled={pending} onClick={() => { if (confirm(`Restore v${v.version} into your draft?`)) run(() => restoreVersion(page.id, v.id), "Restored.", () => window.location.reload()); }} className="shrink-0 font-medium text-blue-600">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {page.isHomepage ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
              This is your homepage. Until you click Publish, visitors keep seeing the built-in homepage. Unpublish to go back to it at any time. It can&apos;t be deleted.
            </section>
          ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex gap-3">
              <button type="button" disabled={pending} onClick={() => run(() => duplicatePage(page.id), "Duplicated.", () => { window.location.href = "/admin/website/pages"; })} className="text-sm font-medium text-slate-700">
                Duplicate page
              </button>
              <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this page? It goes offline immediately.")) run(() => deletePage(page.id), "Deleted.", () => { window.location.href = "/admin/website/pages"; }); }} className="text-sm font-medium text-red-600">
                Delete page
              </button>
            </div>
          </section>
          )}
        </aside>
      </div>
    </div>
  );
}
