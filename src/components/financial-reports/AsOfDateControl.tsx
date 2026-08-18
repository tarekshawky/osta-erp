"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AsOfDateControl({ asOf, label = "As At" }: { asOf: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(newAsOf: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newAsOf) params.set("asOf", newAsOf);
    else params.delete("asOf");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="no-print mb-5">
      <label className="flex flex-col gap-1 w-fit">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input
          type="date"
          value={asOf}
          onChange={(e) => push(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
