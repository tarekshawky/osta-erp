"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { approveReturnRequest, rejectReturnRequest } from "@/app/admin/inventory/returns/actions";

export type ReturnRequestRow = {
  id: string;
  employeeName: string;
  employeeTeamName: string | null;
  itemDisplayName: string;
  unit: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: Date;
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-600",
};

function ApproveModal({
  row,
  branches,
  onClose,
}: {
  row: ReturnRequestRow;
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const defaultBranch = branches.find((b) => b.name === row.employeeTeamName) ?? branches[0];
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(defaultBranch?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await approveReturnRequest(row.id, destinationWarehouseId);
      if (res.ok) {
        showToast("Return approved and stock transferred back.");
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Approve Return</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {row.employeeName} wants to return {row.quantity.toLocaleString()} {row.unit} of {row.itemDisplayName} ({row.reason}).
        </p>

        <label className="mt-3 block text-xs font-medium text-slate-600">Destination Branch</label>
        <select
          value={destinationWarehouseId}
          onChange={(e) => setDestinationWarehouseId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || !destinationWarehouseId}
            onClick={submit}
            className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
          >
            {isPending ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReturnRequestsTable({ rows, branches }: { rows: ReturnRequestRow[]; branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reject(requestId: string) {
    startTransition(async () => {
      const res = await rejectReturnRequest(requestId);
      if (res.ok) {
        showToast("Return rejected.");
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
              <th className="px-4 py-3 font-medium text-right">Quantity</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-900 font-medium">{r.employeeName}</td>
                <td className="px-4 py-3 text-slate-600">{r.itemDisplayName}</td>
                <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">
                  {r.quantity.toLocaleString()} {r.unit}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.reason}</td>
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
                  No return requests yet.
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
