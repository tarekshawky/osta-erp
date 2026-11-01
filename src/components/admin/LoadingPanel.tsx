"use client";

import { useEffect, useState } from "react";

// Shown while an admin page is being prepared: a spinner and placeholder blocks, and after a few seconds a reassuring note.
export function LoadingPanel() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="px-6 py-8" role="status" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" aria-hidden />
        <p className="text-sm font-medium text-slate-600">Loading…</p>
      </div>
      {slow && <p className="mt-2 text-xs text-slate-500">Still working: this page has a lot of data. It will appear as soon as it is ready.</p>}
      <div className="mt-6 space-y-3" aria-hidden>
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="my-3 h-5 animate-pulse rounded bg-slate-100" style={{ width: `${95 - (i % 4) * 12}%` }} />)}
        </div>
      </div>
    </div>
  );
}
