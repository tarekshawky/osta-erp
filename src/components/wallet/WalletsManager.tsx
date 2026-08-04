"use client";

import { useState } from "react";
import { formatAed } from "@/lib/format";
import { WalletCard } from "./WalletCard";

export type WalletRow = {
  id: string;
  code: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  custody: number;
  revenue: number;
  expenses: number;
  revenueWithdrawn: number;
};

export function WalletsManager({ wallets }: { wallets: WalletRow[] }) {
  const [tab, setTab] = useState<"admin" | "employee">("admin");

  const admins = wallets.filter((w) => w.role === "ADMIN");
  const employees = wallets.filter((w) => w.role === "EMPLOYEE");

  const adminTotal = admins.reduce((sum, w) => sum + w.revenue - w.expenses - w.revenueWithdrawn, 0);
  const employeeTotal = employees.reduce((sum, w) => sum + w.revenue - w.expenses - w.revenueWithdrawn, 0);

  const shown = tab === "admin" ? admins : employees;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Wallets</h2>
      <p className="text-sm text-slate-500 mt-0.5">Manage balances, custody, and transactions</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-950 to-blue-800 text-white p-4">
          <div className="text-xs text-blue-200">Admin Wallets Total</div>
          <div className={`text-2xl font-bold mt-1 ${adminTotal < 0 ? "text-red-300" : ""}`}>{formatAed(adminTotal)}</div>
          <div className="text-xs text-blue-300 mt-1">{admins.length} admin(s)</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-sky-700 to-teal-600 text-white p-4">
          <div className="text-xs text-sky-100">Employee Wallets Total</div>
          <div className="text-2xl font-bold mt-1">{formatAed(employeeTotal)}</div>
          <div className="text-xs text-sky-100 mt-1">{employees.length} employee(s)</div>
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("admin")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            tab === "admin" ? "bg-blue-700 text-white" : "text-slate-600"
          }`}
        >
          Admin Wallets ({admins.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("employee")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            tab === "employee" ? "bg-blue-700 text-white" : "text-slate-600"
          }`}
        >
          Employee Wallets ({employees.length})
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shown.map((w) => (
          <WalletCard
            key={w.id}
            role={w.role === "ADMIN" ? "Admin" : "Employee"}
            code={w.code}
            name={w.name}
            employeeId={w.id}
            custody={w.custody}
            revenue={w.revenue}
            expenses={w.expenses}
            revenueWithdrawn={w.revenueWithdrawn}
          />
        ))}
        {shown.length === 0 && <p className="text-sm text-slate-400 py-10 text-center col-span-2">No wallets found.</p>}
      </div>
    </div>
  );
}
