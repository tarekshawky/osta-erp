"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAed, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { CategoryBadge } from "./CategoryBadge";
import { ExpenseForm, type ExpenseFormValue } from "./ExpenseForm";
import { ExpenseRefundModal } from "./ExpenseRefundModal";
import { DeleteExpenseButton } from "./DeleteExpenseButton";
import { ExpensePdfButton } from "./ExpensePdfButton";
import { Pagination } from "@/components/admin/Pagination";
import { ImportModal } from "@/components/admin/ImportModal";
import { createExpense, updateExpense, importExpensesFromExcel } from "@/app/admin/expenses/actions";

export type ExpenseRow = {
  id: string;
  date: string;
  description: string;
  category: string | null;
  payment: string;
  amount: number;
  status: string;
  refundedAmount: number;
  createdByName: string;
  teamName: string | null;
};

function toFormValue(expense: ExpenseRow): ExpenseFormValue {
  return {
    category: expense.category ?? "Fuel",
    payment: expense.payment,
    amount: expense.amount,
    date: expense.date.slice(0, 10),
    description: expense.description,
  };
}

const emptyFormValue: ExpenseFormValue = {
  category: "Fuel",
  payment: "Cash",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: "",
};

export function ExpensesManager({
  expenses,
  totalCount,
  page,
  totalPages,
  year,
  month,
  teams,
  selectedTeam,
}: {
  expenses: ExpenseRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  year?: string;
  month?: string;
  teams: string[];
  selectedTeam: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

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
          <select
            value={selectedTeam}
            onChange={(e) => updateTeam(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
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

      {mode === "add" && (
        <ExpenseForm
          initial={emptyFormValue}
          onSave={async (value) => {
            const res = await createExpense(value);
            if (res.ok) {
              close();
              router.refresh();
            }
            return res;
          }}
          onCancel={close}
        />
      )}
      {mode === "edit" && editingExpense && (
        <ExpenseForm
          initial={toFormValue(editingExpense)}
          onSave={async (value) => {
            const res = await updateExpense(editingExpense.id, value);
            if (res.ok) {
              close();
              router.refresh();
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
                </td>
                <td className="px-4 py-3 text-slate-900">{exp.description}</td>
                <td className="px-4 py-3">
                  <TeamBadge name={exp.teamName} />
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{exp.createdByName}</td>
                <td className="px-4 py-3 text-slate-600">{exp.payment}</td>
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
                        description: exp.description,
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
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
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
