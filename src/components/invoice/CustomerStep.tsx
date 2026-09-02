"use client";

import { EMIRATES, LEAD_SOURCES } from "@/lib/invoiceData";
import { Field, inputClassName } from "@/components/FormField";
import type { CustomerFormData } from "./types";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const T = {
  ar: {
    customerType: "نوع العميل",
    individual: "فرد",
    company: "شركة",
    companyName: "اسم الشركة",
    companyNamePh: "أدخل اسم الشركة",
    trn: "الرقم الضريبي (اختياري)",
    trnPh: "أدخل الرقم الضريبي",
    contactName: "اسم جهة الاتصال",
    fullNamePh: "أدخل الاسم الكامل",
    customerName: "اسم العميل",
    phone: "رقم الهاتف",
    phonePh: "5X XXX XXXX",
    leadSource: "مصدر العميل",
    emirate: "الإمارة",
    buildingName: "اسم المبنى",
    buildingPh: "أدخل اسم المبنى",
    flatOffice: "رقم الشقة/المكتب",
    flatApt: "رقم الشقة",
    numberPh: "أدخل الرقم",
    next: "التالي",
  },
  en: {
    customerType: "Customer Type",
    individual: "Individual",
    company: "Company",
    companyName: "Company Name",
    companyNamePh: "Enter company name",
    trn: "TRN (Optional)",
    trnPh: "Enter TRN number",
    contactName: "Contact Name",
    fullNamePh: "Enter full name",
    customerName: "Customer Name",
    phone: "Phone Number",
    phonePh: "5X XXX XXXX",
    leadSource: "Lead Source",
    emirate: "Emirate",
    buildingName: "Building Name",
    buildingPh: "Enter building name",
    flatOffice: "Flat/Office No",
    flatApt: "Flat/Apartment No",
    numberPh: "Enter number",
    next: "Next",
  },
} as const;

export function CustomerStep({
  value,
  onChange,
  onNext,
  showLeadSource = true,
  lang = "en",
}: {
  value: CustomerFormData;
  onChange: (value: CustomerFormData) => void;
  onNext: () => void;
  showLeadSource?: boolean;
  lang?: EmployeeLang;
}) {
  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const isValid =
    value.phone.trim().length >= 7 &&
    (value.type === "INDIVIDUAL" ? value.name.trim().length > 0 : value.companyName.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={`text-xs font-medium text-slate-600 mb-1.5 block ${font}`} dir={dir}>
          {s.customerType}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...value, type: "INDIVIDUAL" })}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
              value.type === "INDIVIDUAL"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            } ${font}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
            </svg>
            {s.individual}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, type: "COMPANY" })}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
              value.type === "COMPANY"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            } ${font}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="1" />
              <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" strokeLinecap="round" />
            </svg>
            {s.company}
          </button>
        </div>
      </div>

      {value.type === "COMPANY" && (
        <>
          <Field label={s.companyName} dir={dir} labelClassName={font}>
            <input
              className={inputClassName}
              placeholder={s.companyNamePh}
              value={value.companyName}
              onChange={(e) => onChange({ ...value, companyName: e.target.value })}
            />
          </Field>
          <Field label={s.trn} dir={dir} labelClassName={font}>
            <input
              className={inputClassName}
              placeholder={s.trnPh}
              value={value.trn}
              onChange={(e) => onChange({ ...value, trn: e.target.value })}
            />
          </Field>
          <Field label={s.contactName} dir={dir} labelClassName={font}>
            <input
              className={inputClassName}
              placeholder={s.fullNamePh}
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </Field>
        </>
      )}

      {value.type === "INDIVIDUAL" && (
        <Field label={s.customerName} dir={dir} labelClassName={font}>
          <input
            className={inputClassName}
            placeholder={s.fullNamePh}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Field>
      )}

      <Field label={s.phone} dir={dir} labelClassName={font}>
        <div className="flex gap-2">
          <span className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-500">+971</span>
          <input
            className={inputClassName}
            placeholder={s.phonePh}
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </div>
      </Field>

      {showLeadSource && (
        <Field label={s.leadSource} dir={dir} labelClassName={font}>
          <select
            className={inputClassName}
            value={value.leadSource}
            onChange={(e) => onChange({ ...value, leadSource: e.target.value as CustomerFormData["leadSource"] })}
          >
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={s.emirate} dir={dir} labelClassName={font}>
        <select
          className={inputClassName}
          value={value.emirate}
          onChange={(e) => onChange({ ...value, emirate: e.target.value })}
        >
          {EMIRATES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </Field>

      <Field label={s.buildingName} dir={dir} labelClassName={font}>
        <input
          className={inputClassName}
          placeholder={s.buildingPh}
          value={value.buildingName}
          onChange={(e) => onChange({ ...value, buildingName: e.target.value })}
        />
      </Field>

      <Field label={value.type === "COMPANY" ? s.flatOffice : s.flatApt} dir={dir} labelClassName={font}>
        <input
          className={inputClassName}
          placeholder={s.numberPh}
          value={value.flatNo}
          onChange={(e) => onChange({ ...value, flatNo: e.target.value })}
        />
      </Field>

      <button
        type="button"
        disabled={!isValid}
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
