"use client";

import { inputClassName } from "@/components/FormField";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";
import { WARRANTY_DURATIONS, warrantyDates, type WarrantyFormData } from "@/lib/warranty";

const T = {
  ar: {
    title: "خيارات الضمان",
    hint: "اختر بوضوح: بدون ضمان أو مع ضمان. لا يتم اختيار أي ضمان تلقائياً.",
    none: "بدون ضمان",
    noneHint: "لا يوجد ضمان على الأعمال المنفذة.",
    with: "مع ضمان",
    withHint: "ضمان على الأعمال المذكورة في هذه الفاتورة فقط.",
    legacy: "الإبقاء على الضمان الحالي",
    legacyHint: "ضمان 14 يوماً كما في الفاتورة الأصلية",
    until: "حتى",
    duration: "مدة الضمان",
    days: (n: number) => (n === 7 ? "7 أيام (أسبوع)" : `${n} يوماً`),
    starts: "بداية الضمان",
    fromInvoice: "من تاريخ الفاتورة (تم إنجاز العمل)",
    otherDate: "من تاريخ آخر (تم إنجاز العمل في يوم مختلف)",
    pending: "لم يُنجز العمل بعد (الضمان معلّق حتى اكتمال العمل)",
    workDate: "تاريخ إنجاز العمل",
    runs: "فترة الضمان",
    to: "إلى",
    pendingResult: "معلّق — يبدأ الضمان عند اكتمال العمل.",
    chooseDuration: "اختر مدة الضمان.",
    chooseOption: "اختر بدون ضمان أو مع ضمان للمتابعة.",
  },
  en: {
    title: "Warranty Options",
    hint: "Choose clearly: No Warranty or With Warranty. Nothing is chosen automatically.",
    none: "No Warranty",
    noneHint: "No warranty on the work performed.",
    with: "With Warranty",
    withHint: "Covers only the work listed in this invoice.",
    legacy: "Keep current warranty",
    legacyHint: "14 days, as on the original invoice",
    until: "until",
    duration: "Warranty duration",
    days: (n: number) => (n === 7 ? "7 Days (1 week)" : `${n} Days`),
    starts: "Warranty starts",
    fromInvoice: "From the invoice date (work completed)",
    otherDate: "From another date (work done on a different day)",
    pending: "Work not completed yet (warranty stays Pending)",
    workDate: "Date the work was completed",
    runs: "Warranty period",
    to: "to",
    pendingResult: "Pending — the warranty starts when the work is completed.",
    chooseDuration: "Choose the warranty duration.",
    chooseOption: "Choose No Warranty or With Warranty to continue.",
  },
} as const;

function fmt(d: Date) {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// The employee's (or admin's) warranty choice for the whole invoice, shown after the items and prices. A single choice for the invoice;
// the data shape (a warranty object on the invoice) leaves room to give each item its own later.
export function WarrantyOptions({
  value,
  onChange,
  invoiceDate,
  legacyUntil,
  lang = "en",
}: {
  value: WarrantyFormData;
  onChange: (value: WarrantyFormData) => void;
  invoiceDate: string;
  // Set when an invoice made before this choice existed is being edited: offers keeping its original warranty untouched.
  legacyUntil?: Date | null;
  lang?: EmployeeLang;
}) {
  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";
  const card = (active: boolean) =>
    `rounded-xl border p-3 text-start ${active ? "border-blue-600 bg-blue-50" : "border-slate-200"} ${font}`;

  const invoiceDay = new Date(`${invoiceDate}T12:00:00Z`);
  const days = Number(value.days);
  const dates = value.mode === "WITH" && days ? warrantyDates(days, value.startMode, value.startDate, invoiceDay) : null;

  return (
    <div className="rounded-2xl border border-slate-200 p-3 flex flex-col gap-3" dir={dir}>
      <div>
        <div className={`text-sm font-semibold text-slate-800 ${font}`}>{s.title}</div>
        <p className={`text-xs text-slate-400 mt-0.5 ${font}`}>{s.hint}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange({ ...value, mode: "NONE" })} className={card(value.mode === "NONE")}>
          <div className="text-sm font-semibold text-slate-800">{s.none}</div>
          <div className="text-xs text-slate-500 mt-0.5">{s.noneHint}</div>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "WITH" })}
          className={card(value.mode === "WITH")}
        >
          <div className="text-sm font-semibold text-slate-800">{s.with}</div>
          <div className="text-xs text-slate-500 mt-0.5">{s.withHint}</div>
        </button>
      </div>

      {legacyUntil && (
        <button type="button" onClick={() => onChange({ ...value, mode: "LEGACY" })} className={card(value.mode === "LEGACY")}>
          <div className="text-sm font-semibold text-slate-800">{s.legacy}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {s.legacyHint} — {s.until} {fmt(legacyUntil)}
          </div>
        </button>
      )}

      {value.mode === "WITH" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={`text-xs font-medium text-slate-600 mb-1.5 block ${font}`}>{s.duration}</label>
            <div className="grid grid-cols-3 gap-2">
              {WARRANTY_DURATIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ ...value, days: String(n) as WarrantyFormData["days"] })}
                  className={`rounded-xl border py-2.5 text-xs font-medium ${
                    value.days === String(n) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                  } ${font}`}
                >
                  {s.days(n)}
                </button>
              ))}
            </div>
            {!value.days && <p className={`text-xs text-amber-600 mt-1.5 ${font}`}>{s.chooseDuration}</p>}
          </div>

          <div>
            <label className={`text-xs font-medium text-slate-600 mb-1.5 block ${font}`}>{s.starts}</label>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  ["INVOICE_DATE", s.fromInvoice],
                  ["DATE", s.otherDate],
                  ["PENDING", s.pending],
                ] as const
              ).map(([mode, label]) => (
                <label key={mode} className={`flex items-start gap-2 text-xs text-slate-700 ${font}`}>
                  <input
                    type="radio"
                    name="warranty-start"
                    className="mt-0.5"
                    checked={value.startMode === mode}
                    onChange={() => onChange({ ...value, startMode: mode })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {value.startMode === "DATE" && (
              <div className="mt-2">
                <label className={`text-xs text-slate-500 ${font}`}>{s.workDate}</label>
                <input
                  type="date"
                  className={inputClassName}
                  value={value.startDate}
                  onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                />
              </div>
            )}
          </div>

          {value.days && (
            <p className={`text-xs rounded-lg bg-slate-50 px-3 py-2 text-slate-600 ${font}`}>
              <span className="font-semibold">{s.runs}: </span>
              {value.startMode === "PENDING"
                ? s.pendingResult
                : dates && dates.start && dates.until
                  ? `${fmt(dates.start)} ${s.to} ${fmt(dates.until)}`
                  : s.workDate}
            </p>
          )}
        </div>
      )}

      {!value.mode && <p className={`text-xs text-amber-600 ${font}`}>{s.chooseOption}</p>}
    </div>
  );
}
