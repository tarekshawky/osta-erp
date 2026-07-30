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
    "bg-transparent text-xs sm:text-sm text-white border-none focus:outline-none [&>option]:text-slate-900 max-w-[6.5rem] sm:max-w-none";

  return (
    <div className="flex items-center rounded-full bg-white/10 divide-x divide-white/15 focus-within:ring-1 focus-within:ring-white/40">
      <select
        value={selectedMonth}
        onChange={(e) => updateParam("month", e.target.value)}
        className={`${selectClass} pl-3 pr-2 py-1.5 rounded-l-full`}
      >
        <option value="all">All Months</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={selectedYear}
        onChange={(e) => updateParam("year", e.target.value)}
        className={`${selectClass} pl-2 pr-3 py-1.5 rounded-r-full`}
      >
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
