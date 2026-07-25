"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed, formatDate } from "@/lib/format";
import { PayrollTypeBadge } from "./PayrollTypeBadge";
import { PayrollForm, type PayrollFormValue } from "./PayrollForm";
import { DeletePayrollButton } from "./DeletePayrollButton";
import { Pagination } from "@/components/admin/Pagination";
import { createPayrollEntry, updatePayrollEntry } from "@/app/admin/payroll/actions";

export type PayrollRow = {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  note: string | null;
  createdByName: string;
};

function toFormValue(entry: PayrollRow): PayrollFormValue {
  return {
    employeeId: entry.employeeId,
    type: entry.type,
    amount: entry.amount,
    date: entry.date.slice(0, 10),
    note: entry.note ?? "",
  };
}

function emptyFormValue(defaultEmployeeId: string): PayrollFormValue {
  return {
    employeeId: defaultEmployeeId,
    type: "Salary",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

export function PayrollManager({
  entries,
  totalCount,
  page,
  totalPages,
  year,
  month,
  employees,
  selectedEmployee,
}: {
  entries: PayrollRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  year?: string;
  month?: string;
  employees: { id: string; name: string }[];
  selectedEmployee: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  function updateEmployeeFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("employee");
    } else {
      params.set("employee", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/payroll?${qs}` : "/admin/payroll");
  }

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(entry: PayrollRow) {
    setEditingId(entry.id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  const editingEntry = editingId ? entries.find((e) => e.id === editingId) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} records</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedEmployee}
            onChange={(e) => updateEmployeeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Payroll Entry
          </button>
        </div>
      </div>

      {mode === "add" && (
        <PayrollForm
          employees={employees}
          initial={emptyFormValue(selectedEmployee !== "all" ? selectedEmployee : "")}
          onSave={async (value) => {
            const res = await createPayrollEntry(value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Payroll entry added.");
            }
            return res;
          }}
          onCancel={close}
        />
      )}
      {mode === "edit" && editingEntry && (
        <PayrollForm
          employees={employees}
          initial={toFormValue(editingEntry)}
          onSave={async (value) => {
            const res = await updatePayrollEntry(editingEntry.id, value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Payroll entry updated.");
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
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">Recorded By</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(new Date(entry.date))}</td>
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap">{entry.employeeName}</td>
                <td className="px-4 py-3">
                  <PayrollTypeBadge type={entry.type} />
                </td>
                <td className="px-4 py-3 text-slate-500">{entry.note ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{entry.createdByName}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                    entry.type === "Deduction" ? "text-red-500" : "text-slate-900"
                  }`}
                >
                  {entry.type === "Deduction" ? "-" : ""}
                  {formatAed(entry.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      title="Edit"
                      className="text-blue-600 hover:text-blue-700 p-1.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <DeletePayrollButton entryId={entry.id} className="text-red-500 hover:text-red-600 p-1.5" />
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No payroll entries recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/payroll"
          searchParams={{ year, month, employee: selectedEmployee !== "all" ? selectedEmployee : undefined }}
        />
      </div>
    </div>
  );
}
