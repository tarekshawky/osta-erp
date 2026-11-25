"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, IndentDecrease, IndentIncrease, Trash2, X } from "lucide-react";
import { AUTO_LABEL, TYPE_LABEL, canIndent, typeOf, type Found, type ItemType, type MenuNode } from "@/lib/site/menuModel";
import { MENU_MAX_DEPTH } from "@/lib/site/menuTree";
import { MAX_BADGE } from "@/lib/site/siteRules";
import { PagePicker, type PageOption } from "./PagePicker";

const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const lab = "block text-xs font-semibold text-slate-600";
const icon = "flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-30";

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-1.5 text-sm text-slate-700">
      <span>{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} /></span>
    </button>
  );
}

export function EditPanel({ found, tree, pages, pageUrls, onPatch, onDone, onDuplicate, onDelete, onMove, onIndent, onOutdent }: {
  found: Found; tree: MenuNode[]; pages: PageOption[]; pageUrls: ReadonlySet<string>;
  onPatch: (patch: Partial<MenuNode>, field: string) => void; onDone: () => void; onDuplicate: () => void; onDelete: () => void;
  onMove: (by: -1 | 1) => void; onIndent: () => void; onOutdent: () => void;
}) {
  const n = found.node;
  const type = typeOf(n, pageUrls);
  const [picking, setPicking] = useState(false);
  const page = pages.find((p) => p.url === n.url);
  const showPicker = picking || (type === "page" && !n.url);

  const setType = (t: ItemType) => {
    setPicking(false);
    if (t === "page") onPatch({ style: "link", pick: "page", url: pageUrls.has(n.url) ? n.url : "" }, "type");
    else if (t === "link") onPatch({ style: "link", pick: "link" }, "type");
    else if (t === "heading") onPatch({ style: "link", pick: "heading", url: "" }, "type");
    else onPatch({ style: "button", pick: undefined }, "type");
  };
  const choose = (p: PageOption) => { setPicking(false); onPatch({ url: p.url, labelEn: n.labelEn || p.labelEn, labelAr: n.labelAr || p.labelAr, pick: n.style === "button" ? undefined : "page" }, "url"); };

  return (
    <section aria-label="Edit item" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Edit item</h3>
        <div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{TYPE_LABEL[type]}</span><button type="button" aria-label="Close" onClick={onDone} className="text-slate-400"><X size={16} /></button></div>
      </div>

      {type === "auto" ? (
        <p className="mb-3 rounded-xl bg-teal-50 p-3 text-xs text-teal-800">Automatic list. Its links come from <strong>{AUTO_LABEL[n.url]?.source}</strong> and update by themselves. Items you place under it appear after them.</p>
      ) : (
        <div role="radiogroup" aria-label="Item type" className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {(["page", "link", "heading", "button"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} disabled={t === "heading" && found.depth >= MENU_MAX_DEPTH} onClick={() => setType(t)}
              className={`rounded-lg py-1.5 text-xs font-semibold disabled:opacity-30 ${type === t ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}>{t === "heading" ? "Heading" : TYPE_LABEL[t]}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className={lab}>Name (English)<input value={n.labelEn} onChange={(e) => onPatch({ labelEn: e.target.value }, "labelEn")} className={input} /></label>
        <label className={lab}>الاسم (عربي)<input dir="rtl" value={n.labelAr} onChange={(e) => onPatch({ labelAr: e.target.value }, "labelAr")} className={input} /></label>

        {type === "heading" && <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">No link: it opens a dropdown of its sub-items. Add sub-items with the + on its row.</p>}
        {(type === "link" || type === "button") && (
          <label className={lab}>Link<input dir="ltr" value={n.url} onChange={(e) => onPatch({ url: e.target.value }, "url")} placeholder="/page, https://…, https://wa.me/…, tel:+971…" className={input} /></label>
        )}
        {(type === "page" || type === "button" || type === "link") && (
          <div>
            {type === "page" && <p className={lab}>Link to page</p>}
            {type === "page" && n.url && !picking && (
              <button type="button" onClick={() => setPicking(true)} className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 py-2 text-start">
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{page?.labelEn ?? n.url}</span><span className="block truncate text-xs text-slate-500" dir="ltr">{n.url}</span></span><span className="text-xs font-semibold text-blue-600">Change</span>
              </button>
            )}
            {(type === "button" || type === "link") && !picking && <button type="button" onClick={() => setPicking(true)} className="mt-1 text-xs font-semibold text-blue-600">Or choose a page…</button>}
            {showPicker && <div className="mt-1"><PagePicker pages={pages} onPick={choose} autoFocus={picking} /></div>}
          </div>
        )}

        <div className="border-y border-slate-100 py-1">
          <Switch label="Visible" checked={n.visible} onChange={(v) => onPatch({ visible: v }, "visible")} />
          <Switch label="Show on desktop" checked={n.showDesktop} onChange={(v) => onPatch({ showDesktop: v }, "showDesktop")} />
          <Switch label="Show on mobile" checked={n.showMobile} onChange={(v) => onPatch({ showMobile: v }, "showMobile")} />
          <Switch label="Open in new tab" checked={n.newTab} onChange={(v) => onPatch({ newTab: v }, "newTab")} />
        </div>

        <div>
          <p className={lab}>Badge (a small tag beside the name)</p>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Badge in English" maxLength={MAX_BADGE} value={n.badgeEn} onChange={(e) => onPatch({ badgeEn: e.target.value }, "badgeEn")} placeholder="New" className={input} />
            <input aria-label="Badge in Arabic" dir="rtl" maxLength={MAX_BADGE} value={n.badgeAr} onChange={(e) => onPatch({ badgeAr: e.target.value }, "badgeAr")} placeholder="جديد" className={input} />
          </div>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={() => onPatch({ badgeEn: "New", badgeAr: "جديد" }, "badge")} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">+ New</button>
            {(n.badgeEn || n.badgeAr) && <button type="button" onClick={() => onPatch({ badgeEn: "", badgeAr: "" }, "badge")} className="text-xs text-slate-500">Remove badge</button>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={icon} disabled={found.index === 0} onClick={() => onMove(-1)}><ArrowUp size={13} /> Up</button>
          <button type="button" className={icon} disabled={found.index === found.siblings.length - 1} onClick={() => onMove(1)}><ArrowDown size={13} /> Down</button>
          <button type="button" className={icon} disabled={!canIndent(tree, n.uid)} onClick={onIndent} title="Make it a sub-item of the item above"><IndentIncrease size={13} /> Into</button>
          <button type="button" className={icon} disabled={!found.parent} onClick={onOutdent} title="Move it one level up"><IndentDecrease size={13} /> Out</button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onDone} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">Done</button>
          <button type="button" onClick={onDuplicate} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"><Copy size={14} /> Duplicate</button>
          <button type="button" onClick={onDelete} className="ms-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600"><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </section>
  );
}
