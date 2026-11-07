"use client";

import Link from "next/link";
import { useState } from "react";
import { CLASS_LABEL } from "@/lib/expenseClasses";

// "Add Expense" starts here: what kind of expense is it? Each kind has its own fields and its own accounting.
export function ExpenseTypeChooser({ onCompany, onClose }: { onCompany: () => void; onClose: () => void }) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const card = "flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-md";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Choose the expense type" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Add Expense · إضافة مصروف</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Choose the type of expense first. · اختر نوع المصروف أولاً.</p>

        <div className="mt-4 grid gap-3">
          <button type="button" className={`${card} ${companyOpen ? "border-blue-400" : ""}`} onClick={() => setCompanyOpen((o) => !o)} aria-expanded={companyOpen}>
            <span className="text-base font-semibold text-slate-900">1. {CLASS_LABEL.COMPANY.en} · {CLASS_LABEL.COMPANY.ar}</span>
            <span className="text-sm text-slate-500">{CLASS_LABEL.COMPANY.text}</span>
          </button>
          {companyOpen && (
            <div className="ml-3 grid gap-2 border-l-2 border-blue-100 pl-3 sm:ml-6">
              <button type="button" onClick={onCompany} className={card}>
                <span className="font-medium text-slate-900">General company expense · مصروف عام</span>
                <span className="text-xs text-slate-500">Rent, utilities, marketing, vehicles and fuel, government fees, maintenance, supplies, other</span>
              </button>
              <Link href="/admin/expenses/new/equipment-rental" className={card}>
                <span className="font-medium text-slate-900">Equipment Rental · إيجار معدات</span>
                <span className="text-xs text-slate-500">Equipment, supplier, dates, price, team, emirate</span>
              </Link>
              <Link href="/admin/expenses/new/transport-rental" className={card}>
                <span className="font-medium text-slate-900">Transport Vehicle Rental · إيجار سيارة نقل</span>
                <span className="text-xs text-slate-500">Vehicle type, lessor, days × daily rate, team, emirate</span>
              </Link>
            </div>
          )}

          <Link href="/admin/expenses/new/employee" className={card}>
            <span className="text-base font-semibold text-slate-900">2. {CLASS_LABEL.EMPLOYEE.en} · {CLASS_LABEL.EMPLOYEE.ar}</span>
            <span className="text-sm text-slate-500">{CLASS_LABEL.EMPLOYEE.text}</span>
          </Link>

          <Link href="/admin/expenses/purchases/new" className={card}>
            <span className="text-base font-semibold text-slate-900">3. {CLASS_LABEL.CUSTOMER_PURCHASE.en} · {CLASS_LABEL.CUSTOMER_PURCHASE.ar}</span>
            <span className="text-sm text-slate-500">{CLASS_LABEL.CUSTOMER_PURCHASE.text}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
