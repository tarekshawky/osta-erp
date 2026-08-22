import { formatAed } from "@/lib/format";

export type InventoryItemRow = {
  id: string;
  displayName: string;
  unit: string;
  category: string;
  subcategory: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  minimumMainStock: number;
  status: string;
  mainQty: number;
  supplierName: string | null;
};

export function InventoryItemListCard({ item, onEdit }: { item: InventoryItemRow; onEdit?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">{item.displayName}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {item.category}
            {item.subcategory ? ` / ${item.subcategory}` : ""} · {item.unit}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.status === "Inactive" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Warehouse Stock</div>
          <div className="font-semibold text-slate-900">
            {item.mainQty.toLocaleString()} {item.unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Minimum Main Stock</div>
          <div className="font-semibold text-slate-900">{item.minimumMainStock.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Cost Price</div>
          <div className="font-semibold text-slate-900">{item.costPrice != null ? formatAed(item.costPrice) : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Selling Price</div>
          <div className="font-semibold text-slate-900">{item.sellingPrice != null ? formatAed(item.sellingPrice) : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Supplier</div>
          <div className="font-semibold text-slate-900">{item.supplierName ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
