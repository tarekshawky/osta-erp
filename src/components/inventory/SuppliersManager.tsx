"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { createSupplier, updateSupplier, type SupplierFormInput } from "@/app/admin/inventory/suppliers/actions";

export type SupplierRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
};

const emptyForm: SupplierFormInput = { name: "", contactPerson: "", phone: "", email: "", notes: "", status: "Active" };

function toForm(s: SupplierRow): SupplierFormInput {
  return {
    name: s.name,
    contactPerson: s.contactPerson ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    notes: s.notes ?? "",
    status: s.status,
  };
}

export function SuppliersManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setMode("add");
  }
  function openEdit(s: SupplierRow) {
    setEditingId(s.id);
    setForm(toForm(s));
    setError(null);
    setMode("edit");
  }
  function close() {
    setMode("closed");
    setEditingId(null);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = mode === "edit" && editingId ? await updateSupplier(editingId, form) : await createSupplier(form);
      if (res.ok) {
        showToast(mode === "edit" ? "Supplier updated." : "Supplier added.");
        close();
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{suppliers.length} supplier(s)</p>
        {mode === "closed" && (
          <button onClick={openAdd} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            + Add Supplier
          </button>
        )}
      </div>

      {mode !== "closed" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Supplier Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Contact Person</span>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Phone</span>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Notes</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !form.name.trim()}
              onClick={save}
              className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact Person</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-900 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.contactPerson ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{s.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openEdit(s)} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
