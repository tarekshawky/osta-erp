"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { deleteForm, saveForm, type FormInput } from "@/app/admin/website/forms-actions";
import { FIELD_TYPES, type FormField } from "@/lib/forms/forms";

export type FormRow = FormInput & { id: string; leads: number; newLeads: number };

const blankField = (n: number): FormField => ({ key: `field${n}`, type: "text", label: { en: "", ar: "" }, required: false });
const blankForm = (): FormInput => ({
  slug: "", nameEn: "", nameAr: "", fields: [{ key: "name", type: "text", label: { en: "Name", ar: "الاسم" }, required: true }, { key: "phone", type: "phone", label: { en: "Phone", ar: "الهاتف" }, required: true }],
  recipients: [], submitLabelEn: "Send", submitLabelAr: "إرسال", successEn: "Thank you! We'll be in touch shortly.", successAr: "شكراً لك! سنتواصل معك قريباً.", active: true,
});

function FieldRow({ f, onChange, onRemove, onMove }: { f: FormField; onChange: (f: FormField) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-[110px_130px_1fr_1fr]">
        <input className={inputClassName} dir="ltr" placeholder="key" value={f.key} onChange={(e) => onChange({ ...f, key: e.target.value })} />
        <select className={inputClassName} value={f.type} onChange={(e) => onChange({ ...f, type: e.target.value as FormField["type"], options: e.target.value === "select" ? (f.options?.length ? f.options : [{ value: "", label: { en: "", ar: "" } }, { value: "", label: { en: "", ar: "" } }]) : undefined })}>
          {FIELD_TYPES.map((t) => (<option key={t}>{t}</option>))}
        </select>
        <input className={inputClassName} placeholder="Label (English)" value={f.label.en} onChange={(e) => onChange({ ...f, label: { ...f.label, en: e.target.value } })} />
        <input className={inputClassName} dir="rtl" placeholder="العنوان بالعربية" value={f.label.ar} onChange={(e) => onChange({ ...f, label: { ...f.label, ar: e.target.value } })} />
      </div>
      {f.type === "select" && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-slate-50 p-2">
          {(f.options ?? []).map((o, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_auto]">
              <input className={inputClassName} dir="ltr" placeholder="value" value={o.value} onChange={(e) => onChange({ ...f, options: f.options!.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <input className={inputClassName} placeholder="Option (English)" value={o.label.en} onChange={(e) => onChange({ ...f, options: f.options!.map((x, j) => (j === i ? { ...x, label: { ...x.label, en: e.target.value } } : x)) })} />
              <input className={inputClassName} dir="rtl" placeholder="الخيار" value={o.label.ar} onChange={(e) => onChange({ ...f, options: f.options!.map((x, j) => (j === i ? { ...x, label: { ...x.label, ar: e.target.value } } : x)) })} />
              <button type="button" onClick={() => onChange({ ...f, options: f.options!.filter((_, j) => j !== i) })} className="px-2 text-sm text-red-600">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...f, options: [...(f.options ?? []), { value: "", label: { en: "", ar: "" } }] })} className="self-start text-xs font-medium text-blue-600">+ Add option</button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.required} onChange={(e) => onChange({ ...f, required: e.target.checked })} /> Required</label>
        <button type="button" onClick={() => onMove(-1)} aria-label="Move up">▲</button>
        <button type="button" onClick={() => onMove(1)} aria-label="Move down">▼</button>
        <button type="button" onClick={onRemove} className="ml-auto font-medium text-red-600">Remove field</button>
      </div>
    </div>
  );
}

function FormEditor({ id, initial, onDone }: { id: string | null; initial: FormInput; onDone: () => void }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [recipients, setRecipients] = useState(initial.recipients.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<FormInput>) => setV((s) => ({ ...s, ...p }));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= v.fields.length) return;
    const copy = [...v.fields];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    set({ fields: copy });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name (English) *"><input className={inputClassName} value={v.nameEn} onChange={(e) => set({ nameEn: e.target.value })} /></Field>
        <Field label="الاسم (Arabic) *" dir="rtl"><input className={inputClassName} dir="rtl" value={v.nameAr} onChange={(e) => set({ nameAr: e.target.value })} /></Field>
        <Field label="Slug *"><input className={inputClassName} dir="ltr" value={v.slug} onChange={(e) => set({ slug: e.target.value })} /></Field>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-800">Fields</p>
        {v.fields.map((f, i) => (
          <FieldRow key={i} f={f} onChange={(nf) => set({ fields: v.fields.map((x, j) => (j === i ? nf : x)) })} onRemove={() => set({ fields: v.fields.filter((_, j) => j !== i) })} onMove={(d) => move(i, d)} />
        ))}
        {v.fields.length < 20 && <button type="button" onClick={() => set({ fields: [...v.fields, blankField(v.fields.length + 1)] })} className="self-start text-sm font-medium text-blue-600">+ Add field</button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Button text (English)"><input className={inputClassName} value={v.submitLabelEn} onChange={(e) => set({ submitLabelEn: e.target.value })} /></Field>
        <Field label="نص الزر (Arabic)" dir="rtl"><input className={inputClassName} dir="rtl" value={v.submitLabelAr} onChange={(e) => set({ submitLabelAr: e.target.value })} /></Field>
        <Field label="Thank-you message (English)"><textarea className={`${inputClassName} min-h-16`} value={v.successEn} onChange={(e) => set({ successEn: e.target.value })} /></Field>
        <Field label="رسالة الشكر (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-16`} dir="rtl" value={v.successAr} onChange={(e) => set({ successAr: e.target.value })} /></Field>
      </div>
      <Field label="Also email new leads to (comma separated, optional)">
        <input className={inputClassName} dir="ltr" placeholder="sales@example.com, ops@example.com" value={recipients} onChange={(e) => setRecipients(e.target.value)} />
      </Field>
      <p className="-mt-2 text-xs text-slate-400">The admin notification address always receives a copy. Emails send only once email delivery (Resend) is configured.</p>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> Active (accepts submissions)</label>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const list = recipients.split(",").map((r) => r.trim()).filter(Boolean);
              const res = await saveForm(id, { ...v, recipients: list });
              if (res.ok) {
                showToast("Form saved.");
                onDone();
              } else setError(res.error ?? "Could not save.");
            })
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save form"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

export function FormsManager({ forms }: { forms: FormRow[] }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="flex max-w-4xl flex-col gap-3">
      {forms.map((f) =>
        editing === f.id ? (
          <FormEditor key={f.id} id={f.id} initial={f} onDone={() => { setEditing(null); router.refresh(); }} />
        ) : (
          <div key={f.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${f.active ? "" : "opacity-60"}`}>
            <div>
              <span className="font-medium text-slate-900">{f.nameEn}</span>
              <span className="ml-2 font-mono text-xs text-slate-400">{f.slug}</span>
              <span className="ml-3 text-xs text-slate-500">{f.fields.length} fields{!f.active ? " · inactive" : ""}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/admin/website/forms/${f.id}/submissions`} className="font-medium text-blue-600">
                Leads ({f.leads}){f.newLeads > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{f.newLeads} new</span>}
              </Link>
              <button type="button" onClick={() => setEditing(f.id)} className="font-medium text-slate-600">Edit</button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Delete the form “${f.nameEn}”?`)) return;
                  const res = await deleteForm(f.id);
                  showToast(res.ok ? "Form deleted." : res.error ?? "Failed.", res.ok ? "success" : "error");
                  if (res.ok) router.refresh();
                }}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
      {editing === "new" ? (
        <FormEditor id={null} initial={blankForm()} onDone={() => { setEditing(null); router.refresh(); }} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="self-start text-sm font-medium text-blue-600">+ New form</button>
      )}
    </div>
  );
}
