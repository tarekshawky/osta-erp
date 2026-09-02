"use client";

import { useState, useTransition } from "react";
import { formatAed } from "@/lib/format";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { lookupItemByCode, type EmployeeScanLookupResult } from "@/app/employee/inventory/scan/actions";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const T = {
  ar: {
    placeholder: "أدخل رمز الصنف (SKU) أو الباركود...",
    scan: "مسح",
    lookingUp: "جارٍ البحث...",
    notFound: "لم يتم العثور على صنف بهذا الرمز.",
    myStock: "مخزوني",
    sellingPrice: "سعر البيع",
    sku: "الرمز",
  },
  en: {
    placeholder: "Enter SKU or barcode...",
    scan: "Scan",
    lookingUp: "Looking up...",
    notFound: "No item found for that code.",
    myStock: "My Stock",
    sellingPrice: "Selling Price",
    sku: "SKU",
  },
} as const;

export function EmployeeScanLookup({ lang = "en" }: { lang?: EmployeeLang }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<EmployeeScanLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

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
          placeholder={s.placeholder}
          dir={dir}
          className={`flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 ${font}`}
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className={`rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-sm font-medium text-white ${font}`}
        >
          {s.scan}
        </button>
      </div>

      {isPending && (
        <p className={`mt-3 text-sm text-slate-400 ${font}`} dir={dir}>
          {s.lookingUp}
        </p>
      )}
      {notFound && (
        <p className={`mt-3 text-sm text-red-500 ${font}`} dir={dir}>
          {s.notFound}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="font-bold text-slate-900">{result.displayName}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {result.category}
            {result.sku ? ` · ${s.sku}: ${result.sku}` : ""}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm" dir={dir}>
            <div>
              <div className={`text-xs text-slate-400 ${font}`}>{s.myStock}</div>
              <div className="font-semibold text-slate-900">
                {result.myStock.toLocaleString()} {result.unit}
              </div>
            </div>
            <div>
              <div className={`text-xs text-slate-400 ${font}`}>{s.sellingPrice}</div>
              <div className="font-semibold text-slate-900">{result.sellingPrice != null ? formatAed(result.sellingPrice) : "—"}</div>
            </div>
          </div>
        </div>
      )}

      {scanning && <BarcodeScannerModal onDetected={lookup} onClose={() => setScanning(false)} />}
    </div>
  );
}
