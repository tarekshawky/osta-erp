"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function YearFilter({
  years,
  selected,
  basePath,
}: {
  years: number[];
  selected: number | "all";
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "all") {
      params.delete("year");
    } else {
      params.set("year", e.target.value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="px-3 py-1.5 rounded-full bg-white/10 text-sm text-white border-none focus:outline-none focus:ring-1 focus:ring-white/40 [&>option]:text-slate-900"
    >
      <option value="all">All Years</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
