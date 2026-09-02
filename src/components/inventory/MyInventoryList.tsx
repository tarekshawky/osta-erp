"use client";

import { useState } from "react";
import type { EmployeeInventoryRow } from "@/lib/inventoryData";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-green-50 text-green-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Shortage: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-600",
};

const T = {
  ar: {
    search: "ابحث عن صنف...",
    allStatuses: "كل الحالات",
    available: "متوفر",
    lowStock: "كمية محدودة",
    shortage: "نقص",
    outOfStock: "غير متوفر",
    emptyNoItems: "لم تستلم أي مخزون بعد.",
    emptyNoMatch: "لا توجد أصناف مطابقة لبحثك.",
  },
  en: {
    search: "Search items...",
    allStatuses: "All Statuses",
    available: "Available",
    lowStock: "Low Stock",
    shortage: "Shortage",
    outOfStock: "Out of Stock",
    emptyNoItems: "You haven't received any inventory yet.",
    emptyNoMatch: "No items match your search.",
  },
} as const;

export function MyInventoryList({ rows, lang = "en" }: { rows: EmployeeInventoryRow[]; lang?: EmployeeLang }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";
  const STATUS_LABEL: Record<string, string> = {
    Available: s.available,
    "Low Stock": s.lowStock,
    Shortage: s.shortage,
    "Out of Stock": s.outOfStock,
  };

  const filtered = rows.filter((r) => {
    const matchesSearch = !search || r.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || r.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={s.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir={dir}
          className={`flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${font}`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          dir={dir}
          className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 ${font}`}
        >
          <option value="">{s.allStatuses}</option>
          <option value="Available">{s.available}</option>
          <option value="Low Stock">{s.lowStock}</option>
          <option value="Shortage">{s.shortage}</option>
          <option value="Out of Stock">{s.outOfStock}</option>
        </select>
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map((r) => (
          <div key={r.itemId} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">{r.displayName}</div>
              <div className="text-sm text-slate-500 mt-0.5">
                {r.current.toLocaleString()} {r.unit}
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"} ${font}`}
              dir={dir}
            >
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className={`text-sm text-slate-400 text-center py-10 ${font}`} dir={dir}>
            {rows.length === 0 ? s.emptyNoItems : s.emptyNoMatch}
          </p>
        )}
      </div>
    </div>
  );
}
