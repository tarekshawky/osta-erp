"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { CategoryBadge } from "./CategoryBadge";
import { ExpenseForm, type ExpenseFormValue, type ActiveCreditCardOption, type VehicleOption } from "./ExpenseForm";
import { ExpenseRefundModal } from "./ExpenseRefundModal";
import { DeleteExpenseButton } from "./DeleteExpenseButton";
import { ExpensePdfButton } from "./ExpensePdfButton";
import { Pagination } from "@/components/admin/Pagination";
import { ImportModal } from "@/components/admin/ImportModal";
import { canonicalExpensePayment } from "@/lib/expenseData";
import { VEHICLE_EXPENSE_TYPES } from "@/lib/vehicleData";
import { maskCardNumber } from "@/lib/creditCardData";
import { createExpense, updateExpense, importExpensesFromExcel } from "@/app/admin/expenses/actions";

export type ExpenseRow = {
  id: string;
  date: string;
  description: string;
  notes: string | null;
  category: string | null;
  vehicle: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  odometer: number | null;
  subcategory: string | null;
  detailType: string | null;
  liters: number | null;
  nextServiceInterval: number | null;
  payment: string;
  amount: number;
  status: string;
  refundedAmount: number;
  attachmentUrl: string | null;
  createdByName: string;
  teamName: string | null;
  vendor: string | null;
  referenceNumber: string | null;
  creditCardId: string | null;
  creditCardLastFour: string | null;
};

function toFormValue(expense: ExpenseRow): ExpenseFormValue {
  return {
    category: expense.category ?? "Other",
    vehicle: expense.vehicle ?? "",
    vehicleId: expense.vehicleId,
    odometer: expense.odometer,
    subcategory: expense.subcategory ?? "",
    detailType: expense.detailType ?? "",
    liters: expense.liters,
    nextServiceInterval: expense.nextServiceInterval,
    payment: expense.payment,
    amount: expense.amount,
    date: expense.date.slice(0, 10),
    description: expense.description,
    notes: expense.notes ?? "",
    attachmentUrl: expense.attachmentUrl,
    vendor: expense.vendor ?? "",
    referenceNumber: expense.referenceNumber ?? "",
    creditCardId: expense.creditCardId,
  };
}

const emptyFormValue: ExpenseFormValue = {
  category: "Vehicle",
  vehicle: "",
  vehicleId: null,
  odometer: null,
  subcategory: "",
  detailType: "",
  liters: null,
  nextServiceInterval: null,
  payment: "Cash",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: "",
  notes: "",
  attachmentUrl: null,
  vendor: "",
  referenceNumber: "",
  creditCardId: null,
};

export type EmployeeOption = { id: string; name: string };

export function ExpensesManager({
  expenses,
  totalCount,
  page,
  totalPages,
  year,
  month,
  teams,
  selectedTeam,
  activeCards,
  vehicleOptions,
  employeeOptions,
  vehicleFilterId,
  expenseTypeFilter,
  responsibleEmployeeFilterId,
  odometerMin,
  odometerMax,
}: {
  expenses: ExpenseRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  year?: string;
  month?: string;
  teams: string[];
  selectedTeam: string;
  activeCards: ActiveCreditCardOption[];
  vehicleOptions: VehicleOption[];
  employeeOptions: EmployeeOption[];
  vehicleFilterId?: string;
  expenseTypeFilter?: string;
  responsibleEmployeeFilterId?: string;
  odometerMin?: string;
  odometerMax?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showVehicleFilters, setShowVehicleFilters] = useState(
    !!(vehicleFilterId || expenseTypeFilter || responsibleEmployeeFilterId || odometerMin || odometerMax)
  );

  function updateTeam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("team");
    } else {
      params.set("team", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/expenses?${qs}` : "/admin/expenses");
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/expenses?${qs}` : "/admin/expenses");
  }

  function clearVehicleFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["vehicleId", "expenseType", "responsibleEmployeeId", "odometerMin", "odometerMax"]) {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/expenses?${qs}` : "/admin/expenses");
  }

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(expense: ExpenseRow) {
    setEditingId(expense.id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVehicleFilters((v) => !v)}
            className={`text-sm font-medium rounded-lg px-4 py-2 border ${
              showVehicleFilters ? "bg-blue-700 text-white border-blue-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Vehicle Filters
          </button>
          <select
            value={selectedTeam}
            onChange={(e) => updateTeam(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <a
            href={`/admin/expenses/export?${new URLSearchParams({
              ...(year ? { year } : {}),
              ...(month ? { month } : {}),
              ...(selectedTeam !== "all" ? { team: selectedTeam } : {}),
            }).toString()}`}
            className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </a>
          <ImportModal
            title="Import Expenses"
            templateHref="/admin/expenses/import/template"
            onImport={importExpensesFromExcel}
            trigger={
              <span className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21V9m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Import
              </span>
            }
          />
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Expense
          </button>
        </div>
      </div>

      {showVehicleFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Vehicle</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
              value={vehicleFilterId ?? ""}
              onChange={(e) => updateFilter("vehicleId", e.target.value)}
            >
              <option value="">All Vehicles</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Expense Type</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
              value={expenseTypeFilter ?? ""}
              onChange={(e) => updateFilter("expenseType", e.target.value)}
            >
              <option value="">All Types</option>
              {VEHICLE_EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Employee</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
              value={responsibleEmployeeFilterId ?? ""}
              onChange={(e) => updateFilter("responsibleEmployeeId", e.target.value)}
            >
              <option value="">All Employees</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Odometer Min</span>
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
              defaultValue={odometerMin ?? ""}
              onBlur={(e) => updateFilter("odometerMin", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Odometer Max</span>
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
              defaultValue={odometerMax ?? ""}
              onBlur={(e) => updateFilter("odometerMax", e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearVehicleFilters}
              className="text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {mode === "add" && (
        <ExpenseForm
          initial={emptyFormValue}
          activeCards={activeCards}
          vehicleOptions={vehicleOptions}
          onSave={async (value) => {
            const res = await createExpense(value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Expense added.");
            }
            return res;
          }}
          onCancel={close}
        />
      )}
      {mode === "edit" && editingExpense && (
        <ExpenseForm
          initial={toFormValue(editingExpense)}
          activeCards={activeCards}
          vehicleOptions={vehicleOptions}
          onSave={async (value) => {
            const res = await updateExpense(editingExpense.id, value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Expense updated.");
            }
            return res;
          }}
          onCancel={close}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Shop Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(new Date(exp.date))}</td>
                <td className="px-4 py-3">
                  <CategoryBadge category={exp.category} />
                  {(exp.vehicleName || exp.vehicle || exp.subcategory) && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {[exp.vehicleName ?? exp.vehicle, exp.subcategory].filter(Boolean).join(" · ")}
                      {exp.odometer != null && ` · ${exp.odometer.toLocaleString()} KM`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900">{exp.description}</td>
                <td className="px-4 py-3 text-slate-600">{exp.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <TeamBadge name={exp.teamName} />
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{exp.createdByName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {canonicalExpensePayment(exp.payment)}
                  {exp.creditCardLastFour && (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{maskCardNumber(exp.creditCardLastFour)}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                  -{formatAed(exp.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={exp.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(exp)}
                      title="Edit"
                      className="text-blue-600 hover:text-blue-700 p-1.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <ExpensePdfButton
                      expense={{
                        id: exp.id,
                        date: new Date(exp.date),
                        category: exp.category,
                        vehicle: exp.vehicleName ?? exp.vehicle,
                        subcategory: exp.subcategory,
                        description: exp.description,
                        notes: exp.notes,
                        payment: exp.payment,
                        amount: exp.amount,
                        status: exp.status,
                        refundedAmount: exp.refundedAmount,
                        createdByName: exp.createdByName,
                      }}
                      className="text-green-600 hover:text-green-700 p-1.5"
                    />
                    <DeleteExpenseButton expenseId={exp.id} className="text-red-500 hover:text-red-600 p-1.5" />
                    <ExpenseRefundModal
                      expenseId={exp.id}
                      amount={exp.amount}
                      refundedAmount={exp.refundedAmount}
                      disabled={exp.status === "Refunded"}
                      className="text-amber-600 hover:text-amber-700 p-1.5 disabled:opacity-40"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  No expenses recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/expenses"
          searchParams={{ year, month, team: selectedTeam !== "all" ? selectedTeam : undefined }}
        />
      </div>
    </div>
  );
}
