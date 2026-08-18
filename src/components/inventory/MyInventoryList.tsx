"use client";

import { useState } from "react";
import type { EmployeeInventoryRow } from "@/lib/inventoryData";

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-green-50 text-green-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Shortage: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-600",
};

export function MyInventoryList({ rows }: { rows: EmployeeInventoryRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

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
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Shortage">Shortage</option>
          <option value="Out of Stock">Out of Stock</option>
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
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>
              {r.status}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">
            {rows.length === 0 ? "You haven't received any inventory yet." : "No items match your search."}
          </p>
        )}
      </div>
    </div>
  );
}
