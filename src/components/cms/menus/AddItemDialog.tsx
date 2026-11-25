"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronsUpDown, FileText, Link2, MapPin, RectangleHorizontal, Search, Wrench, X } from "lucide-react";
import { blankNode, AUTO_LABEL, type MenuNode } from "@/lib/site/menuModel";
import { AREAS_MENU_URL, SERVICES_MENU_URL } from "@/lib/site/siteRules";
import { PagePicker, searchPages, type PageOption } from "./PagePicker";

const fromPage = (p: PageOption): MenuNode => blankNode({ labelEn: p.labelEn, labelAr: p.labelAr, url: p.url, pick: "page" });

// "Add to … menu": search a page straight away, or pick the kind of item to add.
export function AddItemDialog({ title, pages, autoAllowed, used, onAdd, onClose }: {
  title: string; pages: PageOption[]; autoAllowed: boolean; used: ReadonlySet<string>; onAdd: (n: MenuNode) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [step, setStep] = useState<"kinds" | "page">("kinds");
  const results = useMemo(() => (q.trim() ? searchPages(pages, q, 8) : null), [pages, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tiles = [
    { key: "page", icon: FileText, color: "bg-blue-500", name: "Page", text: `Pick any of the ${pages.length} pages`, run: () => setStep("page") },
    { key: "link", icon: Link2, color: "bg-emerald-500", name: "Custom link", text: "Any URL, WhatsApp or phone", run: () => onAdd(blankNode({ pick: "link" })) },
    { key: "heading", icon: ChevronsUpDown, color: "bg-violet-500", name: "Dropdown heading", text: "No link: opens its sub-items", run: () => onAdd(blankNode({ pick: "heading" })) },
    { key: "button", icon: RectangleHorizontal, color: "bg-indigo-500", name: "Button", text: "Highlighted call to action", run: () => onAdd(blankNode({ style: "button" })) },
    ...(autoAllowed
      ? [
          { key: "areas", icon: MapPin, color: "bg-teal-500", name: "Auto list: Areas We Cover", text: used.has(AREAS_MENU_URL) ? "Already in this menu" : "Always matches Service Areas", run: () => onAdd(blankNode({ labelEn: AUTO_LABEL[AREAS_MENU_URL].en, labelAr: AUTO_LABEL[AREAS_MENU_URL].ar, url: AREAS_MENU_URL })), off: used.has(AREAS_MENU_URL) },
          { key: "services", icon: Wrench, color: "bg-amber-500", name: "Auto list: Services", text: used.has(SERVICES_MENU_URL) ? "Already in this menu" : "Always matches Website Services", run: () => onAdd(blankNode({ labelEn: AUTO_LABEL[SERVICES_MENU_URL].en, labelAr: AUTO_LABEL[SERVICES_MENU_URL].ar, url: SERVICES_MENU_URL })), off: used.has(SERVICES_MENU_URL) },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:pt-24">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-2xl rounded-3xl bg-slate-50 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {step === "page" && <button type="button" aria-label="Back" onClick={() => setStep("kinds")} className="rounded-full bg-white p-1.5 shadow"><ChevronLeft size={16} /></button>}
            {title}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full bg-white p-2 shadow"><X size={16} /></button>
        </div>
        {step === "page" ? (
          <PagePicker pages={pages} autoFocus onPick={(p) => onAdd(fromPage(p))} />
        ) : (
          <>
            <label className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input autoFocus type="search" aria-label="Search pages by title or URL" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages by title or URL…" className="min-w-0 flex-1 text-sm outline-none" />
            </label>
            {results ? (
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {results.items.map((p) => (
                  <li key={p.url}><button type="button" onClick={() => onAdd(fromPage(p))} className="block w-full px-4 py-2.5 text-start hover:bg-blue-50"><span className="block truncate text-sm font-semibold text-slate-900">{p.labelEn || p.labelAr}</span><span className="block truncate text-xs text-slate-500" dir="ltr">{p.url}</span></button></li>
                ))}
                {!results.items.length && <li className="px-4 py-3 text-sm text-slate-500">No page matches. Use “Custom link” for any other address.</li>}
                {results.total > results.items.length && <li className="px-4 py-2 text-xs text-slate-400">{results.total - results.items.length} more. Keep typing to narrow it down.</li>}
              </ul>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tiles.map((t) => (
                  <button key={t.key} type="button" disabled={"off" in t && !!t.off} onClick={t.run} className="flex items-center gap-4 rounded-2xl bg-white p-4 text-start shadow-sm transition hover:shadow-md disabled:opacity-50">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${t.color}`}><t.icon size={20} /></span>
                    <span><span className="block text-sm font-bold text-slate-900">{t.name}</span><span className="block text-xs text-slate-500">{t.text}</span></span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
