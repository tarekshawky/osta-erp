"use client";

import { useState, useTransition } from "react";
import { formatAed } from "@/lib/format";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { lookupItemByCode, type EmployeeScanLookupResult } from "@/app/employee/inventory/scan/actions";

export function EmployeeScanLookup() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<EmployeeScanLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  function lookup(code: string) {
    setScanning(false);
    setNotFound(false);
    startTransition(async () => {
      const res = await lookupItemByCode(code);
      if (res) setResult(res);
      else {
        setResult(null);
        setNotFound(true);
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup(manualCode)}
          placeholder="Enter SKU or barcode..."
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-sm font-medium text-white"
        >
          Scan
        </button>
      </div>

      {isPending && <p className="mt-3 text-sm text-slate-400">Looking up...</p>}
      {notFound && <p className="mt-3 text-sm text-red-500">No item found for that code.</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="font-bold text-slate-900">{result.displayName}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {result.category}
            {result.sku ? ` · SKU: ${result.sku}` : ""}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">My Stock</div>
              <div className="font-semibold text-slate-900">
                {result.myStock.toLocaleString()} {result.unit}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Selling Price</div>
              <div className="font-semibold text-slate-900">{result.sellingPrice != null ? formatAed(result.sellingPrice) : "—"}</div>
            </div>
          </div>
        </div>
      )}

      {scanning && <BarcodeScannerModal onDetected={lookup} onClose={() => setScanning(false)} />}
    </div>
  );
}
