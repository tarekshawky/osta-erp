"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed } from "@/lib/format";
import { createLabourItem, updateLabourItem, type LabourItemFormInput } from "@/app/admin/inventory/labour/actions";

export type LabourItemRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  defaultPrice: number;
  status: string;
};

const emptyForm: LabourItemFormInput = { code: "", nameAr: "", nameEn: "", defaultPrice: "", status: "Active" };

function toForm(l: LabourItemRow): LabourItemFormInput {
  return { code: l.code, nameAr: l.nameAr, nameEn: l.nameEn, defaultPrice: String(l.defaultPrice), status: l.status };
}

export function LabourItemsManager({ labourItems }: { labourItems: LabourItemRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LabourItemFormInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setMode("add");
  }
  function openEdit(l: LabourItemRow) {
    setEditingId(l.id);
    setForm(toForm(l));
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
      const res = mode === "edit" && editingId ? await updateLabourItem(editingId, form) : await createLabourItem(form);
      if (res.ok) {
        showToast(mode === "edit" ? "Labour item updated." : "Labour item added.");
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
        <p className="text-sm text-slate-500">{labourItems.length} labour item(s)</p>
        {mode === "closed" && (
          <button onClick={openAdd} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            + Add Labour Item
          </button>
        )}
      </div>

      {mode !== "closed" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Code *</span>
              <input
                type="text"
                placeholder="E.g. LAB-004"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Default Price (AED) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.defaultPrice}
                onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">English Name *</span>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Arabic Name *</span>
              <input
                type="text"
                dir="rtl"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
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
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !form.code.trim() || !form.nameEn.trim() || !form.nameAr.trim() || !form.defaultPrice}
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
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">English Name</th>
              <th className="px-4 py-3 font-medium">Arabic Name</th>
              <th className="px-4 py-3 font-medium text-right">Default Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {labourItems.map((l) => (
              <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-900 font-medium">{l.code}</td>
                <td className="px-4 py-3 text-slate-900">{l.nameEn}</td>
                <td className="px-4 py-3 text-slate-600" dir="rtl">{l.nameAr}</td>
                <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">{formatAed(l.defaultPrice)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      l.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openEdit(l)} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {labourItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No labour items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
