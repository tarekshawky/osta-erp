// What to change in the redirect table when a page's address changes (or a page goes away), so old links keep
// working, redirects never chain more than once and never loop. Pure: the actions apply the plan in one transaction.

export type RedirectRow = { fromPath: string; toPath: string };
export type RedirectPlan = { upsert: RedirectRow[]; remove: string[] };

// `from` moves to `to` (a page renamed, or removed with `to` = where visitors go instead).
export function planRedirect(existing: readonly RedirectRow[], from: string, to: string): RedirectPlan {
  if (from === to) return { upsert: [], remove: [] };
  const upsert = new Map<string, string>();
  const remove = new Set<string>();
  // The new address is a real page again: nothing may redirect away from it.
  for (const r of existing) if (r.fromPath === to) remove.add(r.fromPath);
  // Everything that pointed at the old address now points at the new one (no chains).
  for (const r of existing) {
    if (r.toPath !== from || r.fromPath === to) continue;
    upsert.set(r.fromPath, to);
  }
  upsert.set(from, to);
  // A redirect pointing at itself would loop.
  for (const [f, t] of upsert) if (f === t) {
    upsert.delete(f);
    remove.add(f);
  }
  return { upsert: [...upsert].map(([fromPath, toPath]) => ({ fromPath, toPath })), remove: [...remove] };
}
