"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed, formatDate } from "@/lib/format";
import { TeamBadge } from "@/components/admin/TeamBadge";
import { Pagination } from "@/components/admin/Pagination";
import { EmployeeForm, type EmployeeFormValue } from "./EmployeeForm";
import { DeleteEmployeeButton } from "./DeleteEmployeeButton";
import { createEmployee, updateEmployee } from "@/app/admin/employees/actions";

export type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  jobTitle: string;
  phone: string | null;
  teamName: string | null;
  role: "EMPLOYEE" | "ADMIN";
  status: string;
  custody: number;
  revenue: number;
  monthlySalary: number;
  hasWallet: boolean;
  joinDate: string | null;
  endOfServiceDate: string | null;
};

function toFormValue(emp: EmployeeRow): EmployeeFormValue {
  return {
    code: emp.code,
    name: emp.name,
    jobTitle: emp.jobTitle,
    phone: emp.phone ?? "",
    teamName: emp.teamName ?? "Ajman",
    role: emp.role === "ADMIN" ? "admin" : "employee",
    pin: "",
    status: (emp.status as EmployeeFormValue["status"]) ?? "active",
    custody: emp.custody,
    monthlySalary: emp.monthlySalary,
    hasWallet: emp.hasWallet,
    joinDate: emp.joinDate ?? "",
    endOfServiceDate: emp.endOfServiceDate ?? "",
  };
}

const emptyFormValue: EmployeeFormValue = {
  code: "",
  name: "",
  jobTitle: "",
  phone: "",
  teamName: "Ajman",
  role: "employee",
  pin: "",
  status: "active",
  custody: 0,
  monthlySalary: 0,
  hasWallet: true,
  joinDate: "",
  endOfServiceDate: "",
};

export function EmployeesManager({
  employees,
  totalCount,
  page,
  totalPages,
}: {
  employees: EmployeeRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(emp: EmployeeRow) {
    setEditingId(emp.id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  const editingEmployee = editingId ? employees.find((e) => e.id === editingId) : undefined;
  const activeCount = employees.filter((e) => e.status === "active").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employees</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} employees</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl mb-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-2xl font-bold mt-1 text-slate-900">{totalCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Active</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Inactive</div>
          <div className="text-2xl font-bold mt-1 text-red-500">{employees.length - activeCount}</div>
        </div>
      </div>

      {mode === "add" && (
        <EmployeeForm
          initial={emptyFormValue}
          isEdit={false}
          onSave={async (value) => {
            const res = await createEmployee(value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Employee added.");
            }
            return res;
          }}
          onCancel={close}
        />
      )}
      {mode === "edit" && editingEmployee && (
        <EmployeeForm
          initial={toFormValue(editingEmployee)}
          isEdit
          onSave={async (value) => {
            const res = await updateEmployee(editingEmployee.id, value);
            if (res.ok) {
              close();
              router.refresh();
              showToast("Employee updated.");
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
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Job Title</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium text-right">Custody</th>
              <th className="px-4 py-3 font-medium text-right">Salary</th>
              <th className="px-4 py-3 font-medium text-right">Revenue</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{emp.name}</div>
                  <div className="text-xs text-slate-400">
                    {emp.role === "ADMIN" ? "admin" : "employee"}
                    {emp.joinDate && ` · Joined ${formatDate(new Date(emp.joinDate))}`}
                  </div>
                  {emp.endOfServiceDate && (
                    <div className="text-xs text-red-500 mt-0.5">Left {formatDate(new Date(emp.endOfServiceDate))}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{emp.code}</td>
                <td className="px-4 py-3 text-slate-600">{emp.jobTitle}</td>
                <td className="px-4 py-3">
                  <TeamBadge name={emp.teamName} />
                </td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(emp.custody)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatAed(emp.monthlySalary)}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{formatAed(emp.revenue)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      emp.status === "active"
                        ? "bg-green-50 text-green-700"
                        : emp.status === "suspended"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(emp)}
                      title="Edit"
                      className="text-blue-600 hover:text-blue-700 p-1.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <DeleteEmployeeButton employeeId={emp.id} className="text-red-500 hover:text-red-600 p-1.5" />
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} basePath="/admin/employees" />
      </div>
    </div>
  );
}
