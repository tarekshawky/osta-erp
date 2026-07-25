import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { ToastOnMount } from "@/components/ToastOnMount";

export default async function EmployeeExpensesPage() {
  const session = await getSession();
  const expenses = await prisma.expense.findMany({
    where: { createdById: session!.employeeId },
    orderBy: { date: "desc" },
  });

  return (
    <div className="pb-8">
      <Suspense fallback={null}>
        <ToastOnMount message="Expense added." />
      </Suspense>
      <TopBar title="Expenses" />
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{expenses.length} records</p>
        <Link
          href="/employee/expenses/new"
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5"
        >
          + Add Expense
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {expenses.map((exp) => (
          <div key={exp.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900 text-sm">{exp.description}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {formatDate(exp.date)} · {[exp.category, exp.vehicle, exp.subcategory].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="font-bold text-red-500 text-sm">-{formatAed(exp.amount)}</div>
          </div>
        ))}
        {expenses.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">No expenses yet.</p>
        )}
      </div>
    </div>
  );
}
