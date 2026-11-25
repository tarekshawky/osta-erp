"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { normalize } from "@/lib/legal/search";

export type PageOption = { group: string; labelEn: string; labelAr: string; url: string };

export const PAGE_RESULTS = 40;

// Searches every page by English or Arabic title, or by address. The list can hold hundreds of pages, so only the best matches are drawn.
export function searchPages(pages: PageOption[], q: string, limit = PAGE_RESULTS): { items: PageOption[]; total: number } {
  const words = normalize(q).split(" ").filter(Boolean);
  const raw = q.trim().toLowerCase();
  const hits = !raw ? pages : pages.filter((p) => {
    if (p.url.toLowerCase().includes(raw)) return true;
    const hay = normalize(`${p.labelEn} ${p.labelAr} ${p.url}`);
    return words.length > 0 && words.every((w) => hay.includes(w));
  });
  return { items: hits.slice(0, limit), total: hits.length };
}

export function PagePicker({ pages, onPick, autoFocus, placeholder = "Search pages by title or URL…" }: { pages: PageOption[]; onPick: (p: PageOption) => void; autoFocus?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const { items, total } = useMemo(() => searchPages(pages, q), [pages, q]);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
        <Search size={15} className="text-slate-400" />
        <input autoFocus={autoFocus} type="search" aria-label="Search pages" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 text-sm outline-none" />
      </label>
      <ul data-testid="page-results" className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {items.map((p) => (
          <li key={p.url}>
            <button type="button" onClick={() => onPick(p)} className="block w-full px-3 py-2 text-start hover:bg-blue-50">
              <span className="block truncate text-sm font-medium text-slate-900">{p.labelEn || p.labelAr}</span>
              <span className="block truncate text-xs text-slate-500" dir="ltr">{p.url} · {p.group}</span>
            </button>
          </li>
        ))}
        {!items.length && <li className="px-3 py-3 text-sm text-slate-500">No page matches.</li>}
      </ul>
      <p className="text-xs text-slate-400">{total > items.length ? `Showing ${items.length} of ${total}. Type to narrow it down.` : `${total} page${total === 1 ? "" : "s"}`}</p>
    </div>
  );
}
