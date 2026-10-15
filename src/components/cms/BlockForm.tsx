"use client";

import { inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useEffect, useRef, useState } from "react";
import { LinkInserter, LinkPreview } from "@/components/cms/LinkInserter";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { listForms } from "@/app/admin/website/forms-actions";
import type { FieldDef } from "@/lib/cms/blocks";
import { ICON_NAMES } from "@/lib/cms/icons";

type Obj = Record<string, unknown>;

function BiInput({ label, value, onChange, multiline, rich }: { label: string; value: { en: string; ar: string }; onChange: (v: { en: string; ar: string }) => void; multiline: boolean; rich?: boolean }) {
  const common = (lang: "en" | "ar") => ({
    className: `${inputClassName} ${multiline ? "min-h-24 resize-none overflow-hidden" : ""}`,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    value: value?.[lang] ?? "",
    placeholder: lang === "en" ? "English" : "العربية",
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value }),
  });
  const enRef = useRef<HTMLTextAreaElement>(null);
  const arRef = useRef<HTMLTextAreaElement>(null);
  // Long text never needs scrolling inside the box: it grows with what you write.
  useEffect(() => {
    for (const r of [enRef, arRef]) {
      const el = r.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight + 2}px`;
      }
    }
  }, [value?.en, value?.ar]);
  if (rich) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {(["en", "ar"] as const).map((lang) => (
          <div key={lang} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-400">{lang === "en" ? "English" : "العربية"}</span>
            <RichTextEditor dir={lang === "ar" ? "rtl" : "ltr"} value={value?.[lang] ?? ""} onChange={(v) => onChange({ ...value, [lang]: v })} placeholder={lang === "en" ? "Write in English…" : "اكتب بالعربية…"} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          {multiline ? <textarea ref={enRef} {...common("en")} /> : <input {...common("en")} />}
          {multiline && <LinkInserter textareaRef={enRef} value={value?.en ?? ""} onValue={(v) => onChange({ ...value, en: v })} />}
          {multiline && <LinkPreview text={value?.en ?? ""} />}
        </div>
        <div className="flex flex-col gap-1.5">
          {multiline ? <textarea ref={arRef} {...common("ar")} /> : <input {...common("ar")} />}
          {multiline && <LinkInserter textareaRef={arRef} value={value?.ar ?? ""} onValue={(v) => onChange({ ...value, ar: v })} />}
          {multiline && <LinkPreview text={value?.ar ?? ""} />}
        </div>
      </div>
      {multiline && <p className="text-[11px] text-slate-400">Links look like [words](/page){`{b,u}`} in the text. Use the “Add a link” button; links open in the same tab unless you tick “Open in a new tab”.</p>}
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
            return <BiInput key={f.key} label={f.label} multiline={f.kind === "bi-textarea"} rich={f.kind === "bi-textarea" && f.rich} value={(v as { en: string; ar: string }) ?? { en: "", ar: "" }} onChange={(x) => set(f.key, x)} />;
          case "text":
          case "url":
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <input className={inputClassName} dir={f.kind === "url" ? "ltr" : undefined} list={f.key === "icon" ? "osta-icon-names" : undefined} placeholder={f.kind === "url" ? "/services or https://…" : f.key === "icon" ? "Start typing: Star, Clock, ShieldCheck…" : undefined} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                {f.key === "icon" && <datalist id="osta-icon-names">{ICON_NAMES.map((n) => (<option key={n} value={n} />))}</datalist>}
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
          case "color": {
            const hex = typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#050b1a";
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={f.label} value={hex} onChange={(e) => set(f.key, e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1" />
                  <span className="text-xs text-slate-500" dir="ltr">{hex}</span>
                </div>
              </label>
            );
          }
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
