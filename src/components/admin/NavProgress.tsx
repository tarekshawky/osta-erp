"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Feedback the moment you click any admin link: a bar runs across the top and a small "Loading…" badge shows until the new page is
// ready, so a slow page never looks like nothing happened.
function Progress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.hash && url.pathname === location.pathname) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // The page changed: done.
  useEffect(() => { void Promise.resolve().then(() => setActive(false)); }, [pathname, search]);
  // Never leave the bar on forever (a failed navigation).
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setActive(false), 120_000);
    return () => clearTimeout(id);
  }, [active]);

  if (!active) return null;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[60]" role="status" aria-live="polite">
      <div className="h-1 overflow-hidden bg-blue-100"><div className="osta-progress h-full w-1/3 rounded bg-blue-600" /></div>
      <div className="mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden /> Loading…
      </div>
    </div>
  );
}

export function NavProgress() {
  return <Suspense fallback={null}><Progress /></Suspense>;
}
