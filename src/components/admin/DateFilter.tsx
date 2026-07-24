"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function DateFilter({
  years,
  selectedYear,
  selectedMonth,
  basePath,
}: {
  years: number[];
  selectedYear: number | "all";
  selectedMonth: number | "all";
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const selectClass =
    "px-3 py-1.5 rounded-full bg-white/10 text-sm text-white border-none focus:outline-none focus:ring-1 focus:ring-white/40 [&>option]:text-slate-900";

  return (
    <div className="flex items-center gap-2">
      <select value={selectedMonth} onChange={(e) => updateParam("month", e.target.value)} className={selectClass}>
        <option value="all">All Months</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select value={selectedYear} onChange={(e) => updateParam("year", e.target.value)} className={selectClass}>
        <option value="all">All Years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
