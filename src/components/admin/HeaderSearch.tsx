"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchNav, visibleNav } from "@/lib/adminNav";
import { useAdminUser } from "./AdminUserContext";

// "Search pages…" in the header (it was in the sidebar): finds any page of the admin by name or keyword. Only pages this
// admin may open are searched.
export function HeaderSearch() {
  const { isSuperAdmin, adminSections } = useAdminUser();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => visibleNav(adminSections, isSuperAdmin).groups, [adminSections, isSuperAdmin]);
  const hits = useMemo(() => searchNav(groups, q), [groups, q]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={box} className="relative w-full">
      <label className="relative block">
        <span className="sr-only">Search pages</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A5B80]" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          placeholder="Search pages…"
          className="h-9 w-full rounded-full border border-[#DCE5F7] bg-white pl-10 pr-4 text-sm text-[#0B1F4D] outline-none placeholder:text-[#4A5B80]/70 focus:border-[#1E5BD8]"
        />
      </label>
      {open && q.trim() && (
        <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-[#DCE5F7] bg-white p-1.5 shadow-xl" role="listbox">
          {hits.length === 0 && <li className="px-3 py-2.5 text-sm text-[#4A5B80]">No page matches “{q}”.</li>}
          {hits.map((h) => (
            <li key={h.href + h.label}>
              <Link href={h.href} onClick={close} className="block rounded-lg px-3 py-2 text-sm text-[#0B1F4D] hover:bg-[#EEF3FC]">
                {h.label}
                <span className="block text-[11px] text-[#4A5B80]">{h.group}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
