"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldEditor } from "@/components/cms/BlockForm";
import { LinkTargetsContext, type LinkTarget } from "@/components/cms/LinkInserter";
import { BLOCK_REGISTRY, BLOCK_TYPES, createBlock, newBlockId, type Block, type BlockType } from "@/lib/cms/blocks";

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

// The list of blocks with drag-to-reorder, hide/duplicate/delete and the "Add block" picker. Used by the page builder
// and by the blog post and service editors, so every content type is built from the same blocks.
export function BlocksEditor({ blocks, onChange, linkTargets }: { blocks: Block[]; onChange: (blocks: Block[]) => void; linkTargets?: LinkTarget[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const setBlocks = onChange;

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = blocks.findIndex((b) => b.id === e.active.id);
    const to = blocks.findIndex((b) => b.id === e.over!.id);
    setBlocks(arrayMove(blocks, from, to));
  }

  function addBlock(type: BlockType) {
    const b = createBlock(type);
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
    </>
  );
  return linkTargets ? <LinkTargetsContext.Provider value={linkTargets}>{body}</LinkTargetsContext.Provider> : body;
}
