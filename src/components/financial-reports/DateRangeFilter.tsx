"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { QUICK_FILTERS } from "@/lib/financialReportsCore";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("from", newFrom);
    else params.delete("from");
    if (newTo) params.set("to", newTo);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyQuickFilter(label: string) {
    const filter = QUICK_FILTERS.find((f) => f.label === label);
    if (!filter) return;
    const range = filter.resolve();
    push(toDateInputValue(range.from), toDateInputValue(range.to));
  }

  return (
    <div className="no-print mb-5">
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => applyQuickFilter(f.label)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-full px-3 py-1.5"
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4 mt-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => push(e.target.value, to)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => push(from, e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
