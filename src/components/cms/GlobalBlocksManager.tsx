"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { deleteGlobalBlock, type GlobalBlockRow } from "@/app/admin/website/global-blocks-actions";
import { formatDate } from "@/lib/format";

export function GlobalBlocksManager({ rows }: { rows: GlobalBlockRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState("");

  function remove(g: GlobalBlockRow) {
    if (!confirm(`Delete the global block “${g.name}”? This cannot be undone.`)) return;
    setBusy(g.id);
    start(async () => {
      const res = await deleteGlobalBlock(g.id);
      setBusy("");
      if (!res.ok) return showToast(res.error ?? "Could not delete.", "error");
      showToast("Global block deleted.");
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
        No global blocks yet. Open any block on a page, choose <strong>Save as global block…</strong>, and it will appear here.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-500">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Block</th>
            <th className="px-4 py-3 font-medium">Used on</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id} className="border-b border-slate-50 last:border-0 align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{g.name}</td>
              <td className="px-4 py-3 text-slate-600">{g.typeLabel}</td>
              <td className="px-4 py-3 text-slate-600">
                {g.usedOn.length === 0 ? <span className="text-slate-400">No page yet</span> : g.usedOn.slice(0, 4).map((u, i) => (
                  <span key={u.id}>{i > 0 && ", "}<Link href={`/admin/website/pages/${u.id}`} className="text-blue-600 hover:underline">{u.title}</Link></span>
                ))}
                {g.usedOn.length > 4 && <span className="text-slate-400"> +{g.usedOn.length - 4} more</span>}
              </td>
              <td className="px-4 py-3 text-slate-500">{formatDate(new Date(g.updatedAt))}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link href={`/admin/website/global-blocks/${g.id}`} className="mr-4 font-medium text-blue-600">Edit</Link>
                <button type="button" disabled={pending && busy === g.id} onClick={() => remove(g)} className="font-medium text-red-600 disabled:opacity-50">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
