"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { recalculatePrices, saveRegionFactors } from "@/app/admin/pricing/actions";

type Region = { id: string; nameEn: string; priceFactor: number };

export function RegionFactors({ regions }: { regions: Region[] }) {
  const { showToast } = useToast();
  const [values, setValues] = useState(() => Object.fromEntries(regions.map((r) => [r.id, String(r.priceFactor)])));
  const [pending, startTransition] = useTransition();
  const dirty = regions.some((r) => Number(values[r.id]) !== r.priceFactor);

  function save() {
    startTransition(async () => {
      const res = await saveRegionFactors(regions.map((r) => ({ regionId: r.id, factor: values[r.id] })));
      showToast(res.ok ? "Price levels saved. Press “Recalculate prices” to apply them." : res.error ?? "Could not save.", res.ok ? "success" : "error");
    });
  }

  function recalc() {
    startTransition(async () => {
      const res = await recalculatePrices();
      showToast(res.ok ? `Prices recalculated: ${res.updated ?? 0} changed, ${res.created ?? 0} added, ${res.keptManual ?? 0} typed by hand kept.` : res.error ?? "Could not recalculate.", res.ok ? "success" : "error");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold text-slate-900">Emirate price levels</h2>
      <p className="mb-3 mt-1 text-sm text-slate-500">
        Each emirate price is the service’s base price × its level (1.00 = the base price), rounded to a whole AED. A price you type in the table below is kept.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {regions.map((r) => (
          <label key={r.id} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            {r.nameEn}
            <input
              value={values[r.id]}
              inputMode="decimal"
              disabled={pending}
              onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
              className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        ))}
        <button type="button" onClick={save} disabled={pending || !dirty} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Save levels</button>
        <button type="button" onClick={recalc} disabled={pending || dirty} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40">Recalculate prices</button>
      </div>
    </div>
  );
}
