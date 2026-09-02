"use client";

import { formatAed } from "@/lib/format";
import { CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import { Field, inputClassName } from "@/components/FormField";
import type { PaymentFormData, ServiceFormData } from "./types";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

type TeamOption = { id: string; name: string };

const METHODS = [
  {
    id: "Cash" as const,
    label: { ar: "نقداً", en: "Cash" },
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: "Bank Transfer" as const,
    label: { ar: "حوالة بنكية", en: "Bank Transfer" },
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10l9-6 9 6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "Ziina" as const,
    label: { ar: "Ziina", en: "Ziina" },
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M10 18h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

const T = {
  ar: {
    selectMethod: "اختر طريقة الدفع",
    invoiceDate: "تاريخ الفاتورة",
    team: "الفريق",
    selectTeam: "اختر فريقاً",
    teamSuffix: "فريق",
    subtotal: "المجموع الفرعي",
    total: "الإجمالي",
    next: "التالي",
  },
  en: {
    selectMethod: "Select Payment Method",
    invoiceDate: "Invoice Date",
    team: "Team",
    selectTeam: "Select a team",
    teamSuffix: "Team",
    subtotal: "Subtotal",
    total: "Total",
    next: "Next",
  },
} as const;

export function PaymentStep({
  value,
  service,
  onChange,
  onNext,
  showInvoiceControls = false,
  teamOptions = [],
  lang = "en",
}: {
  value: PaymentFormData;
  service: ServiceFormData;
  onChange: (value: PaymentFormData) => void;
  onNext: () => void;
  showInvoiceControls?: boolean;
  teamOptions?: TeamOption[];
  lang?: EmployeeLang;
}) {
  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const total = service.items.reduce((sum, item) => {
    const hasItem =
      item.itemType === "SparePart"
        ? !!item.inventoryItemId
        : item.itemType === "Labour"
          ? !!item.labourItemId
          : item.service === CUSTOM_SERVICE_VALUE
            ? item.customName.trim().length > 0
            : item.service.length > 0;
    if (!hasItem) return sum;
    return sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={`text-xs font-medium text-slate-600 mb-1.5 block ${font}`} dir={dir}>
          {s.selectMethod}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...value, method: m.id })}
              className={`flex flex-col items-center gap-1 rounded-xl border py-4 text-xs font-medium ${
                value.method === m.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
              } ${font}`}
            >
              {m.icon}
              {m.label[lang]}
            </button>
          ))}
        </div>
      </div>

      {showInvoiceControls && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={s.invoiceDate} dir={dir} labelClassName={font}>
            <input
              type="date"
              className={inputClassName}
              value={value.date}
              onChange={(event) => onChange({ ...value, date: event.target.value })}
            />
          </Field>
          <Field label={s.team} dir={dir} labelClassName={font}>
            <select
              className={inputClassName}
              value={value.teamId}
              onChange={(event) => onChange({ ...value, teamId: event.target.value })}
            >
              <option value="">{s.selectTeam}</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} {s.teamSuffix}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 p-4 text-sm">
        <div className={`flex justify-between text-slate-500 ${font}`} dir={dir}>
          <span>{s.subtotal}</span>
          <span>{formatAed(total)}</span>
        </div>
        <div className={`flex justify-between font-bold text-slate-900 mt-1 ${font}`} dir={dir}>
          <span>{s.total}</span>
          <span className="text-blue-700">{formatAed(total)}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={showInvoiceControls && (!value.date || !value.teamId)}
        onClick={onNext}
        className={`mt-2 w-full rounded-xl bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3.5 flex items-center justify-center gap-2 ${font}`}
      >
        {s.next}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
