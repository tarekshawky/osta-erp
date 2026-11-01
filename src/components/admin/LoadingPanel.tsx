"use client";

import { useEffect, useState } from "react";

// Shown in the middle of the page while an admin page is being prepared: a spinner, "Loading…", and after a few seconds a reassuring note.
export function LoadingPanel() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-6 text-center" role="status" aria-busy="true" aria-live="polite">
      <span className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" aria-hidden />
      <p className="text-base font-semibold text-slate-700">Loading…</p>
      <p className={`max-w-sm text-sm text-slate-500 transition-opacity duration-500 ${slow ? "opacity-100" : "opacity-0"}`} aria-hidden={!slow}>
        Still working: this page has a lot of data. It will appear as soon as it is ready.
      </p>
    </div>
  );
}
