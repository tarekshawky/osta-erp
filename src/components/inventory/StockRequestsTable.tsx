"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { approveStockRequest, rejectStockRequest } from "@/app/admin/inventory/requests/actions";

export type StockRequestRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTeamName: string | null;
  itemDisplayName: string;
  unit: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  reason: string | null;
  status: string;
  available: number;
  createdAt: Date;
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  PartiallyApproved: "bg-blue-50 text-blue-700",
  Rejected: "bg-red-50 text-red-600",
};

function ApproveModal({
  row,
  branches,
  onClose,
}: {
  row: StockRequestRow;
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [approvedQuantity, setApprovedQuantity] = useState(String(row.requestedQuantity));
  const defaultBranch = branches.find((b) => b.name === row.employeeTeamName) ?? branches[0];
  const [sourceWarehouseId, setSourceWarehouseId] = useState(defaultBranch?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(overrideLimit = false) {
    setError(null);
    setConfirmOverride(null);
    startTransition(async () => {
      const res = await approveStockRequest(row.id, Number(approvedQuantity), sourceWarehouseId, overrideLimit);
      if (res.ok) {
        showToast("Request approved and stock transferred.");
        router.refresh();
        onClose();
      } else if (res.requiresOverride) {
        setConfirmOverride(res.error ?? "This exceeds the employee's maximum allowed quantity for this item.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Approve Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {row.employeeName} requested {row.requestedQuantity.toLocaleString()} {row.unit} of {row.itemDisplayName}. Available: {row.available.toLocaleString()} {row.unit}.
        </p>

        <label className="mt-3 block text-xs font-medium text-slate-600">Source Branch</label>
        <select
          value={sourceWarehouseId}
          onChange={(e) => setSourceWarehouseId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-slate-600">Approved Quantity ({row.unit})</label>
        <input
          type="number"
          min="0"
          max={row.requestedQuantity}
          step="0.001"
          value={approvedQuantity}
          onChange={(e) => setApprovedQuantity(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        />

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {confirmOverride && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">⚠️ {confirmOverride}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => submit(true)}
                className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5"
              >
                Override & Approve
              </button>
              <button
                type="button"
                onClick={() => setConfirmOverride(null)}
                className="text-xs font-medium border border-amber-300 text-amber-700 rounded-lg px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || !approvedQuantity || !sourceWarehouseId}
            onClick={() => submit(false)}
            className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
          >
            {isPending ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StockRequestsTable({ rows, branches }: { rows: StockRequestRow[]; branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reject(requestId: string) {
    startTransition(async () => {
      const res = await rejectStockRequest(requestId);
      if (res.ok) {
        showToast("Request rejected.");
        router.refresh();
      }
    });
  }

  const approvingRow = approvingId ? rows.find((r) => r.id === approvingId) : null;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium text-right">Requested</th>
              <th className="px-4 py-3 font-medium text-right">Available</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-900 font-medium">{r.employeeName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.itemDisplayName}
                  {r.reason && <div className="text-xs text-slate-400 mt-0.5">{r.reason}</div>}
                </td>
                <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">
                  {r.requestedQuantity.toLocaleString()} {r.unit}
                  {r.approvedQuantity != null && r.status !== "Rejected" && (
                    <div className="text-xs text-slate-400">Approved: {r.approvedQuantity.toLocaleString()}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                  {r.status === "Pending" ? `${r.available.toLocaleString()} ${r.unit}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.status === "Pending" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setApprovingId(r.id)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                        Approve
                      </button>
                      <button disabled={isPending} onClick={() => reject(r.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No stock requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {approvingRow && <ApproveModal row={approvingRow} branches={branches} onClose={() => setApprovingId(null)} />}
    </>
  );
}
