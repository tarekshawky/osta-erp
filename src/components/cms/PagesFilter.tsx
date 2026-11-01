"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClearFilters, FilterBar, FilterSelect, ResultCount, SearchField } from "@/components/admin/FilterControls";

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

  return (
    <FilterBar>
      <SearchField
        value={q}
        onChange={(next) => {
          setQ(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push({ q: next.trim() }), 350);
        }}
        placeholder="Search pages by title or URL…"
        label="Search pages"
      />
      <FilterSelect
        value={value("status")}
        onChange={(v) => push({ status: v })}
        label="Filter by status"
        allLabel="All statuses"
        options={[{ value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft" }, { value: "SCHEDULED", label: "Scheduled" }, { value: "ARCHIVED", label: "Archived" }]}
      />
      <FilterSelect value={value("type")} onChange={(v) => push({ type: v })} label="Filter by type" allLabel="All types" options={types.map((t) => ({ value: t, label: t }))} />
      <FilterSelect
        value={value("seo")}
        onChange={(v) => push({ seo: v })}
        label="Filter by SEO score"
        allLabel="Any SEO score"
        options={[{ value: "good", label: "Good (80+)" }, { value: "fair", label: "Fair (55–79)" }, { value: "low", label: "Low (under 55)" }]}
      />
      {filtering && <ClearFilters onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }} />}
      <ResultCount>{filtering ? (shown === 0 ? "No pages match." : `${shown} of ${total} pages`) : `${total} pages`}</ResultCount>
    </FilterBar>
  );
}
