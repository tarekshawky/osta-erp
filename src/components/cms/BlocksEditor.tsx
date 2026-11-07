"use client";

import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldEditor } from "@/components/cms/BlockForm";
import { LinkTargetsContext, type LinkTarget } from "@/components/cms/LinkInserter";
import { BlockLibrary, LibraryIcon } from "@/components/cms/BlockLibrary";
import { ShowcaseEditor } from "@/components/cms/ShowcaseEditor";
import { GlobalBlockRef } from "@/components/cms/GlobalBlockRef";
import { PageTemplates } from "@/components/cms/PageTemplates";
import type { PageTemplate } from "@/lib/cms/pageTemplates";
import { createGlobalBlock, getGlobalBlock, type GlobalBlockRow } from "@/app/admin/website/global-blocks-actions";
import { BLOCK_REGISTRY, createBlock, newBlockId, parseBlocks, type Block, type BlockType } from "@/lib/cms/blocks";
import { LIBRARY, createFromLibrary, type LibraryEntry } from "@/lib/cms/blockLibrary";

// Copy / paste between blocks and pages: the copied block is kept in this browser (so it also works across pages).
const COPY_KEY = "osta-copied-block";
function readCopied(): Block | null {
  try {
    const raw = window.localStorage.getItem(COPY_KEY);
    if (!raw) return null;
    const res = parseBlocks([JSON.parse(raw)]);
    return res.ok ? res.blocks[0] : null;
  } catch {
    return null;
  }
}

const iconOf = (type: Block["type"]) => LIBRARY.find((e) => e.type === type)?.icon ?? "LayoutGrid";

const blockSummary = (b: Block): string => {
  const heading = (b.props.heading as { en?: string } | undefined)?.en;
  return heading?.trim() || "";
};

function SortableBlock({
  block, open, onToggleOpen, onChange, onRemove, onDuplicate, onCopy, onSaveGlobal, onMove, canUp, canDown,
}: {
  block: Block; open: boolean; onToggleOpen: () => void; onChange: (b: Block) => void; onRemove: () => void; onDuplicate: () => void; onCopy: () => void; onSaveGlobal: () => void;
  onMove: (by: -1 | 1) => void; canUp: boolean; canDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const reg = BLOCK_REGISTRY[block.type];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`rounded-xl border bg-white ${block.hidden ? "border-dashed border-slate-300" : "border-slate-200"}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5">
        <button type="button" aria-label="Drag to reorder" className="cursor-grab touch-none px-1 text-slate-400" {...attributes} {...listeners}>
          ⠿
        </button>
        <button type="button" onClick={onToggleOpen} className="flex min-w-[9rem] flex-1 items-center gap-2 overflow-hidden text-left" aria-expanded={open}>
          <LibraryIcon name={block.type === "global" ? "Link" : iconOf(block.type)} size={16} className="shrink-0 text-blue-600" />
          <span className="shrink-0 text-sm font-semibold text-slate-900">{reg.label}</span>
          <span className="truncate text-xs text-slate-400">{blockSummary(block)}</span>
          {block.hidden && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">hidden</span>}
        </button>
        <button type="button" disabled={!canUp} onClick={() => onMove(-1)} aria-label={`Move ${reg.label} up`} title="Move up" className="px-1 text-sm font-medium text-slate-600 disabled:opacity-30">
          ↑
        </button>
        <button type="button" disabled={!canDown} onClick={() => onMove(1)} aria-label={`Move ${reg.label} down`} title="Move down" className="px-1 text-sm font-medium text-slate-600 disabled:opacity-30">
          ↓
        </button>
        <button type="button" onClick={() => onChange({ ...block, hidden: !block.hidden })} className="text-xs font-medium text-slate-600">
          {block.hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onDuplicate} className="text-xs font-medium text-slate-600">
          Duplicate
        </button>
        <button type="button" onClick={onCopy} className="text-xs font-medium text-slate-600">
          Copy
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
            {block.type !== "global" && (
              <button type="button" onClick={onSaveGlobal} className="font-medium text-blue-600">
                Save as global block…
              </button>
            )}
          </div>
          {block.type === "global" ? (
            <GlobalBlockRef globalId={String(block.props.globalId ?? "")} onDetach={(c) => onChange({ ...block, type: c.type, props: structuredClone(c.props) })} />
          ) : block.type === "showcase" ? (
            <>
              <ShowcaseEditor value={block.props} onChange={(props) => onChange({ ...block, props })} />
              <details className="mt-4 rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">All fields</summary>
                <div className="mt-3">
                  <FieldEditor fields={reg.fields} value={block.props} onChange={(props) => onChange({ ...block, props })} />
                </div>
              </details>
            </>
          ) : (
            <FieldEditor fields={reg.fields} value={block.props} onChange={(props) => onChange({ ...block, props })} />
          )}
        </div>
      )}
    </div>
  );
}

// The list of blocks with drag-to-reorder, hide/duplicate/delete and the "Add block" picker. Used by the page builder
// and by the blog post and service editors, so every content type is built from the same blocks.
export function BlocksEditor({ blocks, onChange, linkTargets }: { blocks: Block[]; onChange: (blocks: Block[]) => void; linkTargets?: LinkTarget[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [copied, setCopied] = useState<Block | null>(null);
  const [notice, setNotice] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const setBlocks = onChange;

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = blocks.findIndex((b) => b.id === e.active.id);
    const to = blocks.findIndex((b) => b.id === e.over!.id);
    setBlocks(arrayMove(blocks, from, to));
  }

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    Promise.resolve().then(() => setCopied(readCopied()));
  }, []);

  function copyBlock(b: Block) {
    try {
      window.localStorage.setItem(COPY_KEY, JSON.stringify(b));
      setCopied(b);
      setNotice("Block copied. Use “Paste block” on this or any other page.");
    } catch {
      setNotice("Could not copy: this browser blocks saving.");
    }
  }

  function pasteBlock() {
    const src = readCopied();
    if (!src) return setNotice("Nothing to paste.");
    const copy: Block = { ...structuredClone(src), id: newBlockId() };
    setBlocks([...blocks, copy]);
    setOpenId(copy.id);
    setNotice("Block pasted at the end of the page.");
  }

  // "Save as global block": the content moves into a Global Block and this page keeps a link to it.
  async function saveAsGlobal(b: Block) {
    const name = window.prompt("Name for this global block (for example “Booking CTA”):", BLOCK_REGISTRY[b.type].label)?.trim();
    if (!name) return;
    const res = await createGlobalBlock(b, name);
    if (!res.ok || !res.id) return setNotice(res.error ?? "Could not save the global block.");
    setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, type: "global", props: { globalId: res.id } } : x)));
    setNotice(`Saved as the global block “${name}”. This block is now linked to it.`);
  }

  // From the library's "Global blocks" view: linked (follows the global block) or an independent copy of its content.
  async function addGlobal(g: GlobalBlockRow, mode: "linked" | "copy") {
    let b: Block;
    if (mode === "linked") {
      b = { ...createBlock("global"), props: { globalId: g.id } };
    } else {
      const full = await getGlobalBlock(g.id);
      if (!full) return setNotice("This global block no longer exists.");
      b = { ...createBlock(full.type as BlockType), props: structuredClone(full.props) };
    }
    setBlocks([...blocks, b]);
    setOpenId(b.id);
    setAdding(false);
  }

  function applyTemplate(t: PageTemplate, mode: "add" | "replace") {
    if (mode === "replace" && blocks.length > 0 && !confirm(`Replace all ${blocks.length} blocks on this page with the “${t.name}” template? The current blocks will be removed from the draft.`)) return;
    const built = t.build();
    setBlocks(mode === "replace" ? built : [...blocks, ...built]);
    setOpenId(null);
    setTemplates(false);
    setNotice(`“${t.name}” ${mode === "replace" ? "replaced the page content" : "was added"}. Suggested SEO title: ${t.seo.titleEn}`);
  }

  function addBlock(entry: LibraryEntry) {
    const b = createFromLibrary(entry);
    setBlocks([...blocks, b]);
    setOpenId(b.id);
    setAdding(false);
  }

  const body = (
    <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {blocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No blocks yet. Add your first block below.</p>}
                {blocks.map((b) => (
                  <SortableBlock
                    key={b.id}
                    block={b}
                    open={openId === b.id}
                    onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
                    onChange={(nb) => setBlocks(blocks.map((x) => (x.id === b.id ? nb : x)))}
                    canUp={blocks[0]?.id !== b.id}
                    canDown={blocks[blocks.length - 1]?.id !== b.id}
                    onMove={(by) => {
                      const i = blocks.findIndex((x) => x.id === b.id);
                      setBlocks(arrayMove(blocks, i, i + by));
                    }}
                    onCopy={() => copyBlock(b)}
                    onSaveGlobal={() => void saveAsGlobal(b)}
                    onRemove={() => { if (confirm("Delete this block?")) setBlocks(blocks.filter((x) => x.id !== b.id)); }}
                    onDuplicate={() => {
                      const i = blocks.findIndex((x) => x.id === b.id);
                      const copy: Block = { ...structuredClone(b), id: newBlockId() };
                      setBlocks([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setAdding(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600">
              + Add block
            </button>
            <button type="button" onClick={() => setTemplates(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
              Page templates
            </button>
            {copied && (
              <button type="button" onClick={pasteBlock} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                Paste block ({BLOCK_REGISTRY[copied.type].label})
              </button>
            )}
            {notice && <span role="status" className="text-xs text-slate-500">{notice}</span>}
          </div>
          <PageTemplates open={templates} onClose={() => setTemplates(false)} hasBlocks={blocks.length > 0} onApply={applyTemplate} />
          <BlockLibrary open={adding} onClose={() => setAdding(false)} onAdd={addBlock} onAddGlobal={(g, mode) => void addGlobal(g, mode)} />
    </>
  );
  return linkTargets ? <LinkTargetsContext.Provider value={linkTargets}>{body}</LinkTargetsContext.Provider> : body;
}
