"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { setEmployeeInventoryRequirement } from "@/app/admin/inventory/actions";

export function RequirementForm({
  employees,
  items,
}: {
  employees: { id: string; name: string }[];
  items: { id: string; displayName: string; unit: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [requiredQuantity, setRequiredQuantity] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((i) => i.id === inventoryItemId);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await setEmployeeInventoryRequirement(
        employeeId,
        inventoryItemId,
        Number(requiredQuantity),
        Number(minimumQuantity)
      );
      if (res.ok) {
        setRequiredQuantity("");
        setMinimumQuantity("");
        router.refresh();
        showToast("Requirement saved.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 max-w-xl">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Employee</span>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Item</span>
        <select
          value={inventoryItemId}
          onChange={(e) => setInventoryItemId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Required Quantity {selected ? `(${selected.unit})` : ""}</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={requiredQuantity}
            onChange={(e) => setRequiredQuantity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Minimum Quantity {selected ? `(${selected.unit})` : ""}</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={minimumQuantity}
            onChange={(e) => setMinimumQuantity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4">
        <button
          type="button"
          disabled={isPending || !employeeId || !inventoryItemId || !requiredQuantity}
          onClick={confirm}
          className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5"
        >
          {isPending ? "Saving..." : "Save Requirement"}
        </button>
      </div>
    </div>
  );
}
