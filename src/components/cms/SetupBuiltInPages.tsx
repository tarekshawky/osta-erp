"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBuiltInPage } from "@/app/admin/website/actions";

export type BuiltInRow = { slug: string; label: string; pageId: string | null; status: string | null };

// The site's own pages (About, Contact…) start as built-in. "Make editable" creates a draft copy built from blocks;
// visitors keep the built-in page until it is published.
export function SetupBuiltInPages({ rows }: { rows: BuiltInRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function make(slug: string) {
    setError(null);
    setBusy(slug);
    startTransition(async () => {
      const r = await createBuiltInPage(slug);
      setBusy(null);
      if (r.ok && r.id) router.push(`/admin/website/pages/${r.id}`);
      else setError(r.error ?? "Could not create it.");
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-900">Site pages</p>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Edit the text, images, buttons and backgrounds of the built-in pages. “Make editable” creates a <b>draft</b> copy; visitors keep the built-in page until you publish it, and unpublishing brings it back.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-slate-800">
              {r.label} <span className="text-xs text-slate-400" dir="ltr">/{r.slug}</span>
            </span>
            {r.pageId ? (
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{r.status === "PUBLISHED" ? "Editable · live" : "Editable · draft"}</span>
                <Link href={`/admin/website/pages/${r.pageId}`} className="font-medium text-blue-600">Edit</Link>
              </span>
            ) : (
              <button type="button" disabled={busy !== null} onClick={() => make(r.slug)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 disabled:opacity-50">
                {busy === r.slug ? "Creating…" : "Make editable"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
