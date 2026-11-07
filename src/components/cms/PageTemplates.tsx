"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LibraryIcon } from "@/components/cms/BlockLibrary";
import { BLOCK_REGISTRY } from "@/lib/cms/blocks";
import { LIBRARY } from "@/lib/cms/blockLibrary";
import { PAGE_TEMPLATES, TEMPLATE_CATEGORIES, type PageTemplate, type TemplateCategory } from "@/lib/cms/pageTemplates";

const iconOf = (type: string) => LIBRARY.find((e) => e.type === type)?.icon ?? "LayoutGrid";

// Page Templates: a complete page structure in one click. "Add to this page" puts the blocks after the existing ones;
// "Replace page content" swaps everything (after asking). Every block stays editable afterwards.
export function PageTemplates({ open, onClose, hasBlocks, onApply }: { open: boolean; onClose: () => void; hasBlocks: boolean; onApply: (t: PageTemplate, mode: "add" | "replace") => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return PAGE_TEMPLATES.filter((t) => (category === "all" || t.category === category) && words.every((w) => `${t.name} ${t.description}`.toLowerCase().includes(w)));
  }, [query, category]);
  // Built once per template for the cards' block list (ids are irrelevant here; the real import builds again).
  const outlines = useMemo(() => new Map(PAGE_TEMPLATES.map((t) => [t.id, t.build().map((b) => b.type)])), []);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/50 p-0 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Page templates" className="flex w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="mr-auto text-base font-semibold text-slate-900">Page templates</h2>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" aria-label="Search templates" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} aria-hidden /></button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5" role="group" aria-label="Template categories">
          {([{ id: "all", label: "All templates" }, ...TEMPLATE_CATEGORIES] as { id: TemplateCategory | "all"; label: string }[]).map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={`rounded-full px-3 py-1 text-xs font-medium ${category === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c.label}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {results.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No template matches “{query}”.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((t) => {
                const types = outlines.get(t.id) ?? [];
                return (
                  <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><LibraryIcon name={t.icon} size={20} /></span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs leading-snug text-slate-500">{t.description}</p>
                      </div>
                    </div>
                    <ol className="flex flex-col gap-1 rounded-lg bg-slate-50 p-2.5" aria-label={`Blocks in ${t.name}`}>
                      {types.map((type, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <LibraryIcon name={iconOf(type)} size={13} className="shrink-0 text-blue-500" />
                          {BLOCK_REGISTRY[type].label}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-auto flex gap-2">
                      {hasBlocks && <button type="button" onClick={() => onApply(t, "replace")} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Replace page content</button>}
                      <button type="button" onClick={() => onApply(t, "add")} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700">{hasBlocks ? "Add to this page" : "Use this template"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
