"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type PagesFilterValues = { q: string; status: string; type: string; seo: string };

// Search and filters for the Pages list. They live in the address (?q=…&status=…), so a filtered list can be bookmarked or shared,
// and the server returns only the matching pages.
export function PagesFilter({ types, total, shown }: { types: string[]; total: number; shown: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = (k: keyof PagesFilterValues) => params.get(k) ?? "";
  function push(next: Partial<PagesFilterValues>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) { if (v) sp.set(k, v); else sp.delete(k); }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const filtering = q.trim() !== "" || value("status") !== "" || value("type") !== "" || value("seo") !== "";
  const select = "rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          const next = e.target.value;
          timer.current = setTimeout(() => push({ q: next.trim() }), 350);
        }}
        placeholder="Search pages by title or URL…"
        aria-label="Search pages"
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select value={value("status")} onChange={(e) => push({ status: e.target.value })} aria-label="Filter by status" className={select}>
        <option value="">All statuses</option>
        <option value="PUBLISHED">Published</option>
        <option value="DRAFT">Draft</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="ARCHIVED">Archived</option>
      </select>
      <select value={value("type")} onChange={(e) => push({ type: e.target.value })} aria-label="Filter by type" className={select}>
        <option value="">All types</option>
        {types.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={value("seo")} onChange={(e) => push({ seo: e.target.value })} aria-label="Filter by SEO score" className={select}>
        <option value="">Any SEO score</option>
        <option value="good">Good (80+)</option>
        <option value="fair">Fair (55–79)</option>
        <option value="low">Low (under 55)</option>
      </select>
      {filtering && (
        <button type="button" onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50">Clear</button>
      )}
      <span className="text-slate-500" role="status">{filtering ? (shown === 0 ? "No pages match." : `${shown} of ${total} pages`) : `${total} pages`}</span>
    </div>
  );
}
