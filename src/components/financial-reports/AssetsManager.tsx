"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { AssetForm, type AssetFormValue } from "./AssetForm";
import { AssetListCard, type AssetRow } from "./AssetListCard";
import { createAsset, updateAsset, deleteAsset, type AssetFormInput } from "@/app/admin/financial-reports/assets/actions";

const emptyFormValue: AssetFormValue = {
  name: "",
  category: "Equipment",
  purchaseCost: 0,
  purchaseDate: "",
  usefulLifeYears: 5,
  notes: "",
};

function toFormValue(asset: AssetRow): AssetFormValue {
  return {
    name: asset.name,
    category: asset.category,
    purchaseCost: asset.purchaseCost,
    purchaseDate: asset.purchaseDate.slice(0, 10),
    usefulLifeYears: asset.usefulLifeYears,
    notes: "",
  };
}

export function AssetsManager({ assets }: { assets: AssetRow[] }) {
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

  async function handleSave(value: AssetFormInput) {
    const res = mode === "edit" && editingId ? await updateAsset(editingId, value) : await createAsset(value);
    if (res.ok) {
      showToast(mode === "edit" ? "Asset updated." : "Asset added.");
      close();
      router.refresh();
    }
    return res;
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this asset from the register?")) return;
    const res = await deleteAsset(id);
    if (res.ok) {
      showToast("Asset removed.");
      router.refresh();
    }
  }

  const editingAsset = editingId ? assets.find((a) => a.id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{assets.length} asset(s)</p>
        {mode === "closed" && (
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
          >
            + Add Asset
          </button>
        )}
      </div>

      {mode === "add" && <AssetForm initial={emptyFormValue} onSave={handleSave} onCancel={close} />}
      {mode === "edit" && editingAsset && (
        <AssetForm initial={toFormValue(editingAsset)} onSave={handleSave} onCancel={close} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <AssetListCard
            key={asset.id}
            asset={asset}
            onEdit={() => openEdit(asset.id)}
            onDelete={() => handleDelete(asset.id)}
          />
        ))}
        {assets.length === 0 && (
          <p className="text-sm text-slate-400 py-10 text-center col-span-2">No assets registered yet.</p>
        )}
      </div>
    </div>
  );
}
