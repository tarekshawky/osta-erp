import { formatAed, formatDate } from "@/lib/format";

export type AssetRow = {
  id: string;
  name: string;
  category: string;
  purchaseCost: number;
  purchaseDate: string;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  netBookValue: number;
};

export function AssetListCard({ asset, onEdit, onDelete }: { asset: AssetRow; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-900">{asset.name}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {asset.category} · Purchased {formatDate(new Date(asset.purchaseDate))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button type="button" onClick={onEdit} title="Edit" className="text-blue-600 hover:text-blue-700 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} title="Delete" className="text-red-500 hover:text-red-600 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Purchase Cost</div>
          <div className="font-semibold text-slate-900">{formatAed(asset.purchaseCost)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Accum. Depreciation</div>
          <div className="font-semibold text-red-600">{formatAed(asset.accumulatedDepreciation)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Net Book Value</div>
          <div className="font-semibold text-green-600">{formatAed(asset.netBookValue)}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">Useful life: {asset.usefulLifeYears} year{asset.usefulLifeYears === 1 ? "" : "s"}</div>
    </div>
  );
}
