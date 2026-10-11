"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setServicePrice } from "@/app/admin/pricing/actions";

type Region = { id: string; nameEn: string; nameAr: string; active: boolean };
type Row = { id: string; nameEn: string; active: boolean; prices: Record<string, string> };

function Cell({ serviceId, regionId, initial }: { serviceId: string; regionId: string; initial: string }) {
  const { showToast } = useToast();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  function commit() {
    if (value === saved) return;
    startTransition(async () => {
      const res = await setServicePrice(serviceId, regionId, value);
      if (res.ok) {
        setSaved(value);
        showToast(value.trim() === "" ? "Marked unavailable." : "Price saved.");
      } else {
        setValue(saved);
        showToast(res.error ?? "Could not save.", "error");
      }
    });
  }

  return (
    <input
      value={value}
      inputMode="decimal"
      placeholder="—"
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`w-24 rounded-md border px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        value.trim() === "" ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
      } ${pending ? "opacity-50" : ""}`}
    />
  );
}

export function PriceMatrix({ regions, services }: { regions: Region[]; services: Row[] }) {
  if (services.length === 0) return <p className="text-sm text-slate-500">No services yet. Add one below.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left">Service</th>
            {regions.map((r) => (
              <th key={r.id} className={`px-3 py-3 text-right ${r.active ? "" : "opacity-40"}`}>
                {r.nameEn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map((s) => (
            <tr key={s.id} className={s.active ? "" : "opacity-60"}>
              <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-slate-900">
                {s.nameEn}
                {!s.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
              </td>
              {regions.map((r) => (
                <td key={r.id} className="px-3 py-2 text-right">
                  <Cell serviceId={s.id} regionId={r.id} initial={s.prices[r.id] ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        Unit price in AED. Leave a cell empty to make the service unavailable in that emirate. Saves when you leave the cell.
      </p>
    </div>
  );
}
