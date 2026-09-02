"use client";

import { useState } from "react";
import { SERVICE_CATALOG, CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import { inputClassName } from "@/components/FormField";
import { formatAed } from "@/lib/format";
import type { ServiceFormData, ServiceItemFormData } from "./types";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

export type SparePartOption = {
  id: string;
  sku: string;
  nameAr: string | null;
  name: string;
  specification: string | null;
  category: string;
  subcategory: string | null;
  unit: string;
  sellingPrice: number | null;
  currentStock: number;
};

export type LabourOption = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  defaultPrice: number;
};

const T = {
  ar: {
    item: "عنصر",
    remove: "إزالة",
    service: "خدمة",
    sparePart: "قطعة غيار",
    labour: "عمالة",
    selectService: "-- اختر خدمة --",
    enterServiceName: "أدخل اسم الخدمة...",
    descriptionOptional: "الوصف (اختياري)",
    qty: "الكمية",
    price: "السعر (درهم)",
    selectCategory: "-- اختر الفئة --",
    searchSpareParts: "ابحث بالاسم أو الرمز أو المواصفات...",
    selectSparePart: "-- اختر قطعة غيار --",
    stock: "المخزون",
    catalogPrice: "السعر بالكتالوج",
    finalPrice: "السعر النهائي (درهم)",
    locked: "— مقفل",
    originalPrice: "السعر الأصلي",
    selectLabourType: "-- اختر نوع العمالة --",
    defaultPrice: "السعر الافتراضي",
  },
  en: {
    item: "Item",
    remove: "Remove",
    service: "Service",
    sparePart: "Spare Part",
    labour: "Labour",
    selectService: "-- Select Service --",
    enterServiceName: "Enter service name...",
    descriptionOptional: "Description (optional)",
    qty: "Qty",
    price: "Price (AED)",
    selectCategory: "-- Select Category --",
    searchSpareParts: "Search by name, SKU, or specification...",
    selectSparePart: "-- Select Spare Part --",
    stock: "Stock",
    catalogPrice: "Catalog Price",
    finalPrice: "Final Price (AED)",
    locked: "— locked",
    originalPrice: "Original Price",
    selectLabourType: "-- Select Labour Type --",
    defaultPrice: "Default Price",
  },
} as const;

function sparePartDisplayName(opt: SparePartOption): string {
  return opt.specification ? `${opt.name} — ${opt.specification}` : opt.name;
}

// Not Allowed -> price is locked to the catalog/default price. Allowed /
// Admin Approval Required -> any final price. Allowed with Maximum Discount
// -> editable but floored server-side (and here, for UX) at
// originalPrice * (1 - maxDiscountPercent/100). Mirrors
// src/lib/pricePermissions.ts's validatePriceModification exactly.
function canEditPrice(level: string): boolean {
  return level !== "Not Allowed";
}
function minAllowedPrice(level: string, maxDiscountPercent: number | null, originalPrice: number): number {
  if (level !== "Allowed with Maximum Discount") return 0;
  return originalPrice * (1 - (maxDiscountPercent ?? 0) / 100);
}

export function InvoiceItemLine({
  item,
  index,
  total,
  category,
  onUpdate,
  onRemove,
  sparePartOptions,
  labourOptions,
  sparePartPriceModification,
  sparePartMaxDiscountPercent,
  labourPriceModification,
  labourMaxDiscountPercent,
  lang = "en",
}: {
  item: ServiceItemFormData;
  index: number;
  total: number;
  category: ServiceFormData["category"];
  onUpdate: (patch: Partial<ServiceItemFormData>) => void;
  onRemove: () => void;
  sparePartOptions: SparePartOption[];
  labourOptions: LabourOption[];
  sparePartPriceModification: string;
  sparePartMaxDiscountPercent: number | null;
  labourPriceModification: string;
  labourMaxDiscountPercent: number | null;
  lang?: EmployeeLang;
}) {
  const [sparePartCategory, setSparePartCategory] = useState("");
  const [search, setSearch] = useState("");

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const sparePartCategories = [...new Set(sparePartOptions.map((o) => o.category))].sort();
  const filteredSpareParts = sparePartOptions.filter((o) => {
    if (sparePartCategory && o.category !== sparePartCategory) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.sku.toLowerCase().includes(q) ||
      o.name.toLowerCase().includes(q) ||
      (o.nameAr ?? "").toLowerCase().includes(q) ||
      (o.specification ?? "").toLowerCase().includes(q)
    );
  });

  function selectSparePart(id: string) {
    const opt = sparePartOptions.find((o) => o.id === id);
    onUpdate({
      inventoryItemId: id,
      customName: opt ? sparePartDisplayName(opt) : "",
      originalPrice: opt ? String(opt.sellingPrice ?? 0) : "",
      unitPrice: opt ? String(opt.sellingPrice ?? 0) : "",
    });
  }

  function selectLabour(id: string) {
    const opt = labourOptions.find((o) => o.id === id);
    onUpdate({
      labourItemId: id,
      customName: opt ? opt.nameEn : "",
      originalPrice: opt ? String(opt.defaultPrice) : "",
      unitPrice: opt ? String(opt.defaultPrice) : "",
    });
  }

  const selectedSparePart = sparePartOptions.find((o) => o.id === item.inventoryItemId);
  const selectedLabour = labourOptions.find((o) => o.id === item.labourItemId);

  return (
    <div className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between" dir={dir}>
        <span className={`text-xs font-semibold text-blue-700 ${font}`}>
          {s.item} {index + 1}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemove} className={`text-xs text-red-500 hover:text-red-600 ${font}`}>
            {s.remove}
          </button>
        )}
      </div>

      {/* Quotations reuse ServiceStep but never pass sparePartOptions/labourOptions
          (Spare Parts billing is Invoice-only, per the plan's scope) -- hide the
          3-way toggle entirely in that case rather than showing a dead-end picker
          with nothing selectable. */}
      {(sparePartOptions.length > 0 || labourOptions.length > 0) && (
        <div className="grid grid-cols-3 gap-1.5">
          {(["Service", "SparePart", "Labour"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                onUpdate({
                  itemType: t,
                  service: "",
                  customName: "",
                  unitPrice: "",
                  originalPrice: "",
                  inventoryItemId: "",
                  labourItemId: "",
                })
              }
              className={`rounded-lg border py-2 text-xs font-medium ${
                item.itemType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
              } ${font}`}
            >
              {t === "SparePart" ? s.sparePart : t === "Labour" ? s.labour : s.service}
            </button>
          ))}
        </div>
      )}

      {item.itemType === "Service" && (
        <>
          <select
            className={inputClassName}
            value={item.service}
            onChange={(e) => onUpdate({ service: e.target.value })}
          >
            <option value="">{s.selectService}</option>
            {SERVICE_CATALOG[category].map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
          {item.service === CUSTOM_SERVICE_VALUE && (
            <input
              className={inputClassName}
              placeholder={s.enterServiceName}
              value={item.customName}
              onChange={(e) => onUpdate({ customName: e.target.value })}
              dir={dir}
            />
          )}
          <input
            className={inputClassName}
            placeholder={s.descriptionOptional}
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            dir={dir}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                {s.qty}
              </label>
              <input
                type="number"
                min="1"
                className={inputClassName}
                value={item.qty}
                onChange={(e) => onUpdate({ qty: e.target.value })}
              />
            </div>
            <div>
              <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                {s.price}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={inputClassName}
                value={item.unitPrice}
                onChange={(e) => onUpdate({ unitPrice: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {item.itemType === "SparePart" && (
        <>
          <select
            className={inputClassName}
            value={sparePartCategory}
            onChange={(e) => {
              setSparePartCategory(e.target.value);
              selectSparePart("");
            }}
          >
            <option value="">{s.selectCategory}</option>
            {sparePartCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={inputClassName}
            placeholder={s.searchSpareParts}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir={dir}
          />
          <select className={inputClassName} value={item.inventoryItemId} onChange={(e) => selectSparePart(e.target.value)}>
            <option value="">{s.selectSparePart}</option>
            {filteredSpareParts.map((o) => (
              <option key={o.id} value={o.id}>
                {sparePartDisplayName(o)} ({o.sku})
              </option>
            ))}
          </select>

          {selectedSparePart && (
            <>
              <p className={`text-xs text-slate-500 ${font}`} dir={dir}>
                {s.stock}: <span className="font-semibold text-slate-900">{selectedSparePart.currentStock.toLocaleString()} {selectedSparePart.unit}</span>
                {" · "}
                {s.catalogPrice}: <span className="font-semibold text-slate-900">{formatAed(selectedSparePart.sellingPrice ?? 0)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                    {s.qty}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    value={item.qty}
                    onChange={(e) => onUpdate({ qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                    {s.finalPrice} {!canEditPrice(sparePartPriceModification) && <span className="text-slate-400">{s.locked}</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={minAllowedPrice(sparePartPriceModification, sparePartMaxDiscountPercent, Number(item.originalPrice) || 0)}
                    disabled={!canEditPrice(sparePartPriceModification)}
                    className={`${inputClassName} disabled:bg-slate-50 disabled:text-slate-500`}
                    value={item.unitPrice}
                    onChange={(e) => onUpdate({ unitPrice: e.target.value })}
                  />
                </div>
              </div>
              {Number(item.unitPrice) !== Number(item.originalPrice) && (
                <p className={`text-xs text-slate-400 ${font}`} dir={dir}>
                  {s.originalPrice}: {formatAed(Number(item.originalPrice) || 0)}
                </p>
              )}
            </>
          )}
        </>
      )}

      {item.itemType === "Labour" && (
        <>
          <select className={inputClassName} value={item.labourItemId} onChange={(e) => selectLabour(e.target.value)}>
            <option value="">{s.selectLabourType}</option>
            {labourOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nameEn} ({o.code})
              </option>
            ))}
          </select>

          {selectedLabour && (
            <>
              <p className={`text-xs text-slate-500 ${font}`} dir={dir}>
                {s.defaultPrice}: <span className="font-semibold text-slate-900">{formatAed(selectedLabour.defaultPrice)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                    {s.qty}
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={inputClassName}
                    value={item.qty}
                    onChange={(e) => onUpdate({ qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className={`text-xs text-slate-500 ${font}`} dir={dir}>
                    {s.finalPrice} {!canEditPrice(labourPriceModification) && <span className="text-slate-400">{s.locked}</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={minAllowedPrice(labourPriceModification, labourMaxDiscountPercent, Number(item.originalPrice) || 0)}
                    disabled={!canEditPrice(labourPriceModification)}
                    className={`${inputClassName} disabled:bg-slate-50 disabled:text-slate-500`}
                    value={item.unitPrice}
                    onChange={(e) => onUpdate({ unitPrice: e.target.value })}
                  />
                </div>
              </div>
              {Number(item.unitPrice) !== Number(item.originalPrice) && (
                <p className={`text-xs text-slate-400 ${font}`} dir={dir}>
                  {s.originalPrice}: {formatAed(Number(item.originalPrice) || 0)}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
