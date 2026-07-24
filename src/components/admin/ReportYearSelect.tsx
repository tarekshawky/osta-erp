"use client";

import { useRouter } from "next/navigation";

export function ReportYearSelect({ years, selectedYear }: { years: number[]; selectedYear: number }) {
  const router = useRouter();

  return (
    <select
      value={selectedYear}
      onChange={(e) => router.push(`/admin/reports?year=${e.target.value}`)}
      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
