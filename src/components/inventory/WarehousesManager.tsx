"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { createWarehouse, updateWarehouse } from "@/app/admin/inventory/warehouses/actions";

export type WarehouseRow = { id: string; name: string; type: string; status: string };

export function WarehousesManager({ warehouses }: { warehouses: WarehouseRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Branch");
  const [status, setStatus] = useState("Active");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setName("");
    setType("Branch");
    setStatus("Active");
    setError(null);
    setMode("add");
  }
  function openEdit(w: WarehouseRow) {
    setEditingId(w.id);
    setName(w.name);
    setType(w.type);
    setStatus(w.status);
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
      const res =
        mode === "edit" && editingId
          ? await updateWarehouse(editingId, { name, type, status })
          : await createWarehouse({ name, type, status });
      if (res.ok) {
        showToast(mode === "edit" ? "Warehouse updated." : "Warehouse added.");
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
        <p className="text-sm text-slate-500">{warehouses.length} warehouse(s)</p>
        {mode === "closed" && (
          <button onClick={openAdd} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            + Add Warehouse
          </button>
        )}
      </div>

      {mode !== "closed" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 max-w-md">
          <label className="block text-xs font-medium text-slate-600">Warehouse Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          />

          <label className="mt-3 block text-xs font-medium text-slate-600">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="Branch">Branch</option>
            <option value="Main">Main</option>
          </select>

          <label className="mt-3 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !name.trim()}
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
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-900 font-medium">{w.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      w.type === "Main" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {w.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      w.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openEdit(w)} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No warehouses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
