"use client";

import { useRef, useState, useTransition } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  VEHICLES,
  VEHICLE_EXPENSE_TYPES,
  ADVERTISING_PLATFORMS,
} from "@/lib/expenseData";
import { maskCardNumber } from "@/lib/creditCardData";
import { compressImageFile } from "@/lib/imageCompress";
import type { ExpenseFormInput } from "@/app/admin/expenses/actions";

export type ExpenseFormValue = ExpenseFormInput;

export type ActiveCreditCardOption = { id: string; name: string; cardHolder: string | null; lastFour: string };

export function ExpenseForm({
  initial,
  activeCards,
  onSave,
  onCancel,
}: {
  initial: ExpenseFormValue;
  activeCards: ActiveCreditCardOption[];
  onSave: (value: ExpenseFormValue) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<ExpenseFormValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSavingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setIsAttaching(true);
    setError(null);
    try {
      const dataUrl = file.type.startsWith("image/") ? await compressImageFile(file) : await readFileAsDataUrl(file);
      setValue((v) => ({ ...v, attachmentUrl: dataUrl }));
    } catch {
      setError("Could not process the selected file.");
    } finally {
      setIsAttaching(false);
    }
  }

  function handleSave() {
    if (isSavingRef.current) return;
    if (value.payment === "Credit Card" && !value.creditCardId) {
      setError("Select a credit card.");
      return;
    }
    isSavingRef.current = true;
    setError(null);
    startTransition(async () => {
      const res = await onSave(value);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        isSavingRef.current = false;
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value, vehicle: "", subcategory: "" })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {value.category === "Vehicle" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Vehicle</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                value={value.vehicle}
                onChange={(e) => setValue({ ...value, vehicle: e.target.value })}
              >
                <option value="">Select vehicle...</option>
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Expense Type</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                value={value.subcategory}
                onChange={(e) => setValue({ ...value, subcategory: e.target.value })}
              >
                <option value="">Select type...</option>
                {VEHICLE_EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {value.category === "Advertising" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Platform</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              value={value.subcategory}
              onChange={(e) => setValue({ ...value, subcategory: e.target.value })}
            >
              <option value="">Select platform...</option>
              {ADVERTISING_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Payment Method</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.payment}
            onChange={(e) => {
              const payment = e.target.value;
              setValue({ ...value, payment, creditCardId: payment === "Credit Card" ? value.creditCardId : null });
            }}
          >
            {EXPENSE_PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {value.payment === "Credit Card" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Select Credit Card</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              value={value.creditCardId ?? ""}
              onChange={(e) => setValue({ ...value, creditCardId: e.target.value || null })}
            >
              <option value="">Select card...</option>
              {activeCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cardHolder || c.name} — {maskCardNumber(c.lastFour)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Vendor (optional)</span>
          <input
            type="text"
            placeholder="e.g. Meta"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.vendor ?? ""}
            onChange={(e) => setValue({ ...value, vendor: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Invoice/Receipt Number (optional)</span>
          <input
            type="text"
            placeholder="e.g. INV-1234"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.referenceNumber ?? ""}
            onChange={(e) => setValue({ ...value, referenceNumber: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Amount (AED)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.amount || ""}
            onChange={(e) => setValue({ ...value, amount: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Date</span>
          <input
            type="date"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={value.date}
            onChange={(e) => setValue({ ...value, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Shop Name</span>
          <input
            type="text"
            placeholder="Enter shop name..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Description (optional)</span>
          <input
            type="text"
            placeholder="Add an optional note..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            value={value.notes ?? ""}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Attachment (optional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isAttaching}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-200 disabled:opacity-60 text-slate-700 text-sm font-medium px-3 py-2"
            >
              {isAttaching ? "Processing..." : value.attachmentUrl ? "Replace File" : "Upload File"}
            </button>
            {value.attachmentUrl && (
              <>
                <span className="text-xs text-green-600">File attached</span>
                <button
                  type="button"
                  onClick={() => setValue({ ...value, attachmentUrl: null })}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-3 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
