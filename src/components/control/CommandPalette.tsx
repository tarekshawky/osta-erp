"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, FileText, Search } from "lucide-react";
import { searchWebsitePages, type PageHit } from "@/app/admin/website/search-actions";
import type { NavGroup } from "@/lib/adminNav";
import { searchCommands, type Command, type Workspace } from "@/lib/controlCenter/workspaces";
import { LOOKS } from "./looks";

// "Search anything": every screen the admin may open, and the website's pages by title or address. Mounted only while open.
export function CommandPalette({ workspaces, groups, onClose }: { workspaces: Workspace[]; groups: NavGroup[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; pages: PageHit[] }>({ query: "", pages: [] });
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const typed = query.trim();
  useEffect(() => {
    if (typed.length < 2) return;
    let stale = false;
    const timer = setTimeout(() => {
      searchWebsitePages(typed)
        .then((pages) => { if (!stale) setFound({ query: typed, pages }); })
        .catch(() => { if (!stale) setFound({ query: typed, pages: [] }); });
    }, 250);
    return () => { stale = true; clearTimeout(timer); };
  }, [typed]);

  const pages: Command[] = found.query === typed
    ? found.pages.map((p) => ({ href: `/admin/website/pages/${p.id}`, title: `Pages › ${p.titleEn || p.titleAr}`, hint: `${p.path} · ${p.status === "PUBLISHED" ? "Live" : p.status.toLowerCase()}`, workspace: null }))
    : [];
  const results = searchCommands(workspaces, groups, query, pages);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const open = (command: Command) => { onClose(); router.push(command.href); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const next = (current + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length;
      setActive(next);
      list.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && results[current]) { e.preventDefault(); open(results[current]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#10163a]/40 px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-2xl rounded-3xl bg-white p-3 shadow-2xl">
        <label className="flex items-center gap-3 rounded-2xl bg-[#f0f3fd] px-4 py-3">
          <Search size={18} className="shrink-0 text-[#10163a]" aria-hidden />
          <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder="Search anything…" aria-label="Search anything"
            role="combobox" aria-expanded aria-controls="cc-results" aria-activedescendant={results[current] ? `cc-result-${current}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#10163a] outline-none placeholder:font-normal placeholder:text-[#6b7399]" />
        </label>
        <ul ref={list} id="cc-results" role="listbox" className="mt-1 max-h-[56vh] overflow-y-auto">
          {results.map((r, i) => {
            const look = r.workspace ? LOOKS[r.workspace] : null;
            const Icon = look?.icon ?? FileText;
            return (
              <li key={`${r.href}|${r.title}`} id={`cc-result-${i}`} role="option" aria-selected={i === current}>
                <button type="button" tabIndex={-1} onClick={() => open(r)} onMouseMove={() => i !== current && setActive(i)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left ${i === current ? "bg-[#f0f3fd]" : ""}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${look?.gradient ?? "from-[#a9b4c8] to-[#48536b]"}`}><Icon size={18} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#10163a]">{r.title}</span>
                    <span className="block truncate text-xs text-[#6b7399]">{r.hint}</span>
                  </span>
                  <CornerDownLeft size={14} className={`shrink-0 text-[#6b7399] ${i === current ? "" : "opacity-0"}`} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        {!results.length && <p className="px-4 py-6 text-center text-sm text-[#6b7399]">{typed.length >= 2 && found.query !== typed ? "Searching…" : "Nothing matches."}</p>}
      </div>
    </div>
  );
}
