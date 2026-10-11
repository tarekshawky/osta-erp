"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName } from "@/components/FormField";
import { createPage } from "@/app/admin/website/actions";
import { slugify } from "@/lib/cms/pageRules";

export function NewPageForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [type, setType] = useState("page");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
        + New page
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title (English) *">
          <input
            className={inputClassName}
            value={titleEn}
            onChange={(e) => {
              setTitleEn(e.target.value);
              if (!touched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="العنوان (Arabic) *" dir="rtl">
          <input className={inputClassName} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        </Field>
        <Field label="Slug (URL) *">
          <input className={inputClassName} dir="ltr" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} />
        </Field>
        <Field label="Type">
          <select className={inputClassName} value={type} onChange={(e) => setType(e.target.value)}>
            {["page", "service", "area", "article", "landing"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await createPage({ titleEn, titleAr, slug, type });
              if (res.ok && res.id) router.push(`/admin/website/pages/${res.id}`);
              else setError(res.error ?? "Could not create the page.");
            })
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create and edit"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
