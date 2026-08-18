"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { InventoryItemForm, type InventoryItemFormValue } from "./InventoryItemForm";
import { InventoryItemListCard, type InventoryItemRow } from "./InventoryItemListCard";
import { createInventoryItem, updateInventoryItem } from "@/app/admin/inventory/actions";

const emptyFormValue: InventoryItemFormValue = {
  name: "",
  specification: "",
  unit: "Piece",
  category: "AC",
  description: "",
  costPrice: "",
  sellingPrice: "",
  minimumMainStock: 0,
  status: "Active",
};

export type InventoryItemManagerRow = InventoryItemRow & {
  name: string;
  specification: string | null;
  description: string | null;
};

function toFormValue(item: InventoryItemManagerRow): InventoryItemFormValue {
  return {
    name: item.name,
    specification: item.specification ?? "",
    unit: item.unit,
    category: item.category,
    description: item.description ?? "",
    costPrice: item.costPrice != null ? String(item.costPrice) : "",
    sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : "",
    minimumMainStock: item.minimumMainStock,
    status: item.status,
  };
}

export function InventoryItemsManager({ items }: { items: InventoryItemManagerRow[] }) {
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

  async function handleSave(value: InventoryItemFormValue) {
    const res = mode === "edit" && editingId ? await updateInventoryItem(editingId, value) : await createInventoryItem(value);
    if (res.ok) {
      showToast(mode === "edit" ? "Inventory item updated." : "Inventory item added.");
      close();
      router.refresh();
    }
    return res;
  }

  const editingItem = editingId ? items.find((i) => i.id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} item(s)</p>
        {mode === "closed" && (
          <button
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Inventory Item
          </button>
        )}
      </div>

      {mode === "add" && <InventoryItemForm initial={emptyFormValue} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && editingItem && (
        <InventoryItemForm initial={toFormValue(editingItem)} onSave={handleSave} onCancel={close} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <InventoryItemListCard key={item.id} item={item} onEdit={() => openEdit(item.id)} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 py-10 text-center col-span-2">No inventory items added yet.</p>
        )}
      </div>
    </div>
  );
}
