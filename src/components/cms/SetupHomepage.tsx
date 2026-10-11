"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHomepage } from "@/app/admin/website/actions";

export function SetupHomepage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-sm font-semibold text-blue-900">Make your homepage editable</p>
      <p className="mt-1 max-w-2xl text-sm text-blue-800">
        This creates a <b>draft</b> copy of today&apos;s homepage built from blocks. Nothing changes for visitors until you preview it and click Publish; you can unpublish at any time to return to the built-in homepage.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { setError(null); const r = await createHomepage(); if (r.ok && r.id) router.push(`/admin/website/pages/${r.id}`); else setError(r.error ?? "Could not create it."); })}
        className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create editable homepage"}
      </button>
    </div>
  );
}
