"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { FieldEditor } from "@/components/cms/BlockForm";
import { ShowcaseEditor } from "@/components/cms/ShowcaseEditor";
import { updateGlobalBlock } from "@/app/admin/website/global-blocks-actions";
import { BLOCK_REGISTRY, type BlockType } from "@/lib/cms/blocks";

export function GlobalBlockEditor({ id, name: initialName, type, props: initialProps, usedOn }: { id: string; name: string; type: string; props: Record<string, unknown>; usedOn: { id: string; title: string }[] }) {
  const { showToast } = useToast();
  const [name, setName] = useState(initialName);
  const [props, setProps] = useState(initialProps);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const reg = BLOCK_REGISTRY[type as BlockType];

  function save() {
    start(async () => {
      const res = await updateGlobalBlock(id, name, props);
      if (!res.ok) return showToast(res.error ?? "Could not save.", "error");
      setDirty(false);
      showToast(usedOn.length > 0 ? `Saved. ${usedOn.length} page${usedOn.length > 1 ? "s" : ""} will show the new content once the website refreshes.` : "Saved.");
    });
  }

  if (!reg) return <p className="text-sm text-red-600">This global block has an unknown type.</p>;
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/website/global-blocks" className="text-sm text-slate-500">← Global blocks</Link>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{reg.label}</span>
        <button type="button" onClick={save} disabled={pending || !dirty} className="ml-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>
      <Field label="Name">
        <input className={inputClassName} value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
      </Field>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {type === "showcase" ? (
          <ShowcaseEditor value={props} onChange={(p) => { setProps(p); setDirty(true); }} />
        ) : (
          <FieldEditor fields={reg.fields} value={props} onChange={(p) => { setProps(p); setDirty(true); }} />
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-slate-900">Used on</p>
        {usedOn.length === 0 ? <p className="text-slate-400">No page uses this block yet.</p> : (
          <ul className="flex flex-col gap-1">
            {usedOn.map((u) => (<li key={u.id}><Link href={`/admin/website/pages/${u.id}`} className="text-blue-600 hover:underline">{u.title}</Link></li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
