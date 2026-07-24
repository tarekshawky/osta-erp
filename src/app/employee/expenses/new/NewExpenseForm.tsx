"use client";

import { useState } from "react";
import { Field, inputClassName } from "@/components/FormField";
import {
  EXPENSE_CATEGORIES,
  VEHICLES,
  VEHICLE_EXPENSE_TYPES,
  ADVERTISING_PLATFORMS,
} from "@/lib/expenseData";
import { createExpense } from "./actions";

export function NewExpenseForm() {
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);

  return (
    <form action={createExpense} className="px-5 py-5 flex flex-col gap-4">
      <Field label="Description">
        <input name="description" required className={inputClassName} placeholder="e.g. Fuel" />
      </Field>
      <Field label="Category">
        <select
          name="category"
          className={inputClassName}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      {category === "Vehicle" && (
        <>
          <Field label="Vehicle">
            <select name="vehicle" className={inputClassName} defaultValue="">
              <option value="">Select vehicle...</option>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expense Type">
            <select name="subcategory" className={inputClassName} defaultValue="">
              <option value="">Select type...</option>
              {VEHICLE_EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      {category === "Advertising" && (
        <Field label="Platform">
          <select name="subcategory" className={inputClassName} defaultValue="">
            <option value="">Select platform...</option>
            {ADVERTISING_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Amount (AED)">
        <input name="amount" type="number" step="0.01" min="0.01" required className={inputClassName} />
      </Field>
      <Field label="Date">
        <input
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClassName}
        />
      </Field>
      <button
        type="submit"
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium text-sm"
      >
        Add Expense
      </button>
    </form>
  );
}
