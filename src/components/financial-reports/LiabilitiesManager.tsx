"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { LiabilityForm, type LiabilityFormValue } from "./LiabilityForm";
import { LiabilityListCard, type LiabilityRow } from "./LiabilityListCard";
import {
  createLiability,
  updateLiability,
  deleteLiability,
  type LiabilityFormInput,
} from "@/app/admin/financial-reports/liabilities/actions";

const emptyFormValue: LiabilityFormValue = {
  name: "",
  type: "Bank Borrowing",
  category: "Current",
  amount: 0,
  notes: "",
};

function toFormValue(liability: LiabilityRow): LiabilityFormValue {
  return {
    name: liability.name,
    type: liability.type,
    category: liability.category,
    amount: liability.amount,
    notes: liability.notes ?? "",
  };
}

export function LiabilitiesManager({ liabilities }: { liabilities: LiabilityRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setMode("add");
  }

  function openEdit(id: string) {
    setEditingId(id);
    setMode("edit");
  }

  function close() {
    setMode("closed");
    setEditingId(null);
  }

  async function handleSave(value: LiabilityFormInput) {
    const res = mode === "edit" && editingId ? await updateLiability(editingId, value) : await createLiability(value);
    if (res.ok) {
      showToast(mode === "edit" ? "Liability updated." : "Liability added.");
      close();
      router.refresh();
    }
    return res;
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this liability from the register?")) return;
    const res = await deleteLiability(id);
    if (res.ok) {
      showToast("Liability removed.");
      router.refresh();
    }
  }

  const editingLiability = editingId ? liabilities.find((l) => l.id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{liabilities.length} liability(ies)</p>
        {mode === "closed" && (
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Liability
          </button>
        )}
      </div>

      {mode === "add" && <LiabilityForm initial={emptyFormValue} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && editingLiability && (
        <LiabilityForm initial={toFormValue(editingLiability)} onSave={handleSave} onCancel={close} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {liabilities.map((liability) => (
          <LiabilityListCard
            key={liability.id}
            liability={liability}
            onEdit={() => openEdit(liability.id)}
            onDelete={() => handleDelete(liability.id)}
          />
        ))}
        {liabilities.length === 0 && (
          <p className="text-sm text-slate-400 py-10 text-center col-span-2">No liabilities registered yet.</p>
        )}
      </div>
    </div>
  );
}
