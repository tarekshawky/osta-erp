"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { setPageParent } from "@/app/admin/website/structure-actions";

// "Parent page" of an existing page. Saved at once (it is part of the site structure, not of the page's draft content),
// never changes the page's URL, and cannot create a loop (the page and its own sub-pages are not offered).
export function ParentPicker({ pageId, initial, choices }: { pageId: string; initial: string; choices: { id: string; label: string }[] }) {
  const { showToast } = useToast();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>Parent page</span>
      <select
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:opacity-60"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          startTransition(async () => {
            const res = await setPageParent(pageId, next || null);
            if (res.ok) showToast("Parent page saved");
            else {
              setValue(prev);
              showToast(res.error ?? "Could not change the parent page");
            }
          });
        }}
      >
        <option value="">— None (top level) —</option>
        {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <span className="text-xs text-slate-400">Organises the page tree only. The page’s URL stays the same. Arrange the whole tree under Website → Page structure.</span>
    </label>
  );
}
