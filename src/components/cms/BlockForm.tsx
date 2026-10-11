"use client";

import { inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useEffect, useState } from "react";
import { listForms } from "@/app/admin/website/forms-actions";
import type { FieldDef } from "@/lib/cms/blocks";

type Obj = Record<string, unknown>;

function BiInput({ label, value, onChange, multiline }: { label: string; value: { en: string; ar: string }; onChange: (v: { en: string; ar: string }) => void; multiline: boolean }) {
  const common = (lang: "en" | "ar") => ({
    className: `${inputClassName} ${multiline ? "min-h-24" : ""}`,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    value: value?.[lang] ?? "",
    placeholder: lang === "en" ? "English" : "العربية",
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value }),
  });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {multiline ? <textarea {...common("en")} /> : <input {...common("en")} />}
        {multiline ? <textarea {...common("ar")} /> : <input {...common("ar")} />}
      </div>
    </div>
  );
}

function FormPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [forms, setForms] = useState<{ slug: string; name: string; active: boolean }[] | null>(null);
  useEffect(() => {
    void listForms().then(setForms).catch(() => setForms([]));
  }, []);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select className={inputClassName} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{forms === null ? "Loading…" : "Choose a form"}</option>
        {forms?.map((f) => (
          <option key={f.slug} value={f.slug}>{f.name}{f.active ? "" : " (inactive)"}</option>
        ))}
      </select>
      {value && forms && !forms.some((f) => f.slug === value) && <span className="text-xs text-red-500">This form no longer exists.</span>}
    </label>
  );
}

// Generic editor driven by the block registry's field definitions -- no per-block form code.
export function FieldEditor({ fields, value, onChange }: { fields: FieldDef[]; value: Obj; onChange: (v: Obj) => void }) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => {
        const v = value[f.key];
        switch (f.kind) {
          case "bi-text":
          case "bi-textarea":
            return <BiInput key={f.key} label={f.label} multiline={f.kind === "bi-textarea"} value={(v as { en: string; ar: string }) ?? { en: "", ar: "" }} onChange={(x) => set(f.key, x)} />;
          case "text":
          case "url":
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <input className={inputClassName} dir={f.kind === "url" ? "ltr" : undefined} placeholder={f.kind === "url" ? "/services or https://…" : undefined} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              </label>
            );
          case "textarea":
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <textarea className={`${inputClassName} min-h-24`} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              </label>
            );
          case "number":
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <input className={inputClassName} inputMode="numeric" value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value === "" ? 0 : Number(e.target.value) || 0)} />
              </label>
            );
          case "image":
            return <ImageUploadField key={f.key} label={f.label} value={(v as string) ?? ""} onChange={(x) => set(f.key, x)} />;
          case "select":
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <select className={inputClassName} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          case "form-select":
            return <FormPicker key={f.key} label={f.label} value={(v as string) ?? ""} onChange={(x) => set(f.key, x)} />;
          case "group":
            return (
              <fieldset key={f.key} className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-500">{f.label}</legend>
                <FieldEditor fields={f.fields} value={(v as Obj) ?? {}} onChange={(x) => set(f.key, x)} />
              </fieldset>
            );
          case "list": {
            const items = (Array.isArray(v) ? v : []) as Obj[];
            const blank = (): Obj => Object.fromEntries(f.fields.map((x) => [x.key, x.kind.startsWith("bi-") ? { en: "", ar: "" } : x.kind === "number" ? 0 : x.kind === "group" ? {} : x.kind === "select" ? x.options[0].value : ""]));
            return (
              <div key={f.key} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{f.label}</span>
                  {items.length < f.max && (
                    <button type="button" onClick={() => set(f.key, [...items, blank()])} className="text-xs font-medium text-blue-600">
                      + Add {f.itemLabel.toLowerCase()}
                    </button>
                  )}
                </div>
                {items.length === 0 && <p className="text-xs text-slate-400">None yet.</p>}
                <div className="flex flex-col gap-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {f.itemLabel} {i + 1}
                        </span>
                        <button type="button" onClick={() => set(f.key, items.filter((_, idx) => idx !== i))} className="font-medium text-red-600">
                          Remove
                        </button>
                      </div>
                      <FieldEditor fields={f.fields} value={item} onChange={(x) => set(f.key, items.map((it, idx) => (idx === i ? x : it)))} />
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
