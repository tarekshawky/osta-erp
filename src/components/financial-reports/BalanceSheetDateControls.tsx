"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function BalanceSheetDateControls({ asOf, comparative }: { asOf: string; comparative: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(newAsOf: string, newComparative: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newAsOf) params.set("asOf", newAsOf);
    else params.delete("asOf");
    if (newComparative) params.set("comparative", newComparative);
    else params.delete("comparative");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="no-print flex flex-wrap items-end gap-4 mb-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">As At</span>
        <input
          type="date"
          value={asOf}
          onChange={(e) => push(e.target.value, comparative)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Comparative As At</span>
        <input
          type="date"
          value={comparative}
          onChange={(e) => push(asOf, e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
