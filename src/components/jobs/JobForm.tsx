"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName } from "@/components/FormField";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { useToast } from "@/components/Toast";
import { saveJob, setJobStatus } from "@/app/admin/jobs/actions";
import { EMIRATES, EMIRATE_LABEL, JOB_TYPE_LABEL, JOB_TYPES, MATERIALS_BY, MATERIALS_LABEL, PROPERTY_LABEL, PROPERTY_TYPES } from "@/lib/jobs/constants";
import { jobInputSchema, missingTranslations } from "@/lib/jobs/schema";
import type { CategoryDto, JobDto } from "@/lib/jobs/service";

type Values = {
  type: "PERMANENT" | "DAILY"; categoryId: string; titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; workersRequired: string;
  emirate: string; area: string; propertyType: string; startDate: string; applicationDeadline: string;
  monthlySalaryMin: string; monthlySalaryMax: string; workingDaysPerWeek: string; dailyWage: string; workingDays: string; dailyHours: string; materialsBy: string;
  wageToBeAgreed: boolean; requirementsEn: string; requirementsAr: string; customFields: Record<string, string | number | boolean>;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function initialValues(j: JobDto | null, categories: CategoryDto[]): Values {
  if (!j) {
    return {
      type: "DAILY", categoryId: categories[0]?.id ?? "", titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", workersRequired: "1", emirate: "DUBAI", area: "", propertyType: "",
      startDate: "", applicationDeadline: "", monthlySalaryMin: "", monthlySalaryMax: "", workingDaysPerWeek: "", dailyWage: "", workingDays: "", dailyHours: "", materialsBy: "", wageToBeAgreed: false,
      requirementsEn: "", requirementsAr: "", customFields: {},
    };
  }
  return {
    type: j.type, categoryId: j.categoryId, titleEn: j.titleEn, titleAr: j.titleAr, descriptionEn: j.descriptionEn, descriptionAr: j.descriptionAr, workersRequired: String(j.workersRequired),
    emirate: j.emirate, area: j.area, propertyType: j.propertyType ?? "", startDate: j.startDate, applicationDeadline: j.applicationDeadline,
    monthlySalaryMin: str(j.monthlySalaryMin), monthlySalaryMax: str(j.monthlySalaryMax), workingDaysPerWeek: str(j.workingDaysPerWeek), dailyWage: str(j.dailyWage), workingDays: str(j.workingDays),
    dailyHours: j.dailyHours, materialsBy: j.materialsBy ?? "", wageToBeAgreed: j.wageToBeAgreed, requirementsEn: j.requirementsEn, requirementsAr: j.requirementsAr, customFields: { ...j.customFields },
  };
}

const toPayload = (v: Values) => ({ ...v, propertyType: v.propertyType || null, materialsBy: v.materialsBy || null });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function JobForm({ job, categories, areas }: { job: JobDto | null; categories: CategoryDto[]; areas: string[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [v, setV] = useState<Values>(() => initialValues(job, categories));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ missing: string[] } | null>(null);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((cur) => ({ ...cur, [k]: val }));

  const category = categories.find((c) => c.id === v.categoryId);
  const fields = useMemo(() => (category?.fields ?? []).filter((f) => f.appliesTo.includes(v.type)), [category, v.type]);
  const daily = v.type === "DAILY";
  const locked = !!job && (job.status === "COMPLETED" || job.status === "CANCELLED");

  function validate(): boolean {
    const r = jobInputSchema.safeParse(toPayload(v));
    if (r.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const i of r.error.issues) next[String(i.path[0])] ??= i.message;
    setErrors(next);
    showToast(Object.values(next)[0] ?? "Check the form.", "error");
    return false;
  }

  // Saves the draft and returns the job id, or null if it could not be saved.
  async function save(): Promise<string | null> {
    if (!validate()) return null;
    const res = await saveJob(job?.id ?? null, toPayload(v));
    if (!res.ok) {
      if (res.field) setErrors({ [res.field.split(".")[0]]: res.error ?? "Invalid" });
      showToast(res.error ?? "Could not save the job.", "error");
      return null;
    }
    return res.id ?? null;
  }

  const saveDraft = () =>
    startTransition(async () => {
      const id = await save();
      if (!id) return;
      showToast("Job saved");
      if (job) router.refresh();
      else router.push(`/admin/jobs/${id}`);
    });

  const preview = () =>
    startTransition(async () => {
      const id = await save();
      if (id) window.open(`/jobs/preview/${id}`, "_blank", "noopener");
    });

  const publish = (confirmMissingTranslation: boolean) =>
    startTransition(async () => {
      const id = await save();
      if (!id) return;
      const res = await setJobStatus(id, "PUBLISHED", { confirmMissingTranslation });
      if (res.needsConfirm) {
        setConfirm({ missing: res.missing ?? [] });
        return;
      }
      if (!res.ok) {
        showToast(res.error ?? "Could not publish.", "error");
        if (!job) router.push(`/admin/jobs/${id}/edit`);
        return;
      }
      setConfirm(null);
      showToast("Job published");
      router.push(`/admin/jobs/${id}?share=1`);
    });

  const err = (k: string) => (errors[k] ? <span className="text-xs text-red-600">{errors[k]}</span> : null);
  const missing = missingTranslations(v);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      {locked && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">A completed or cancelled job can&apos;t be edited.</p>}

      <Section title="A. Basics">
        <div role="radiogroup" aria-label="Job type" className="inline-flex w-fit overflow-hidden rounded-lg border border-slate-200">
          {JOB_TYPES.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={v.type === t} onClick={() => set("type", t)} className={`px-4 py-2 text-sm font-medium ${v.type === t ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {JOB_TYPE_LABEL[t].en} <span className="opacity-70">· {JOB_TYPE_LABEL[t].ar}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category *">
            <select className={inputClassName} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.filter((c) => c.active || c.id === v.categoryId).map((c) => <option key={c.id} value={c.id}>{c.nameEn} · {c.nameAr}</option>)}
            </select>
            {err("categoryId")}
          </Field>
          <Field label="Workers required *">
            <input className={inputClassName} inputMode="numeric" value={v.workersRequired} onChange={(e) => set("workersRequired", e.target.value)} />
            {err("workersRequired")}
          </Field>
          <Field label="Title (English)"><input className={inputClassName} value={v.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="e.g. Villa painter" /></Field>
          <Field label="العنوان (Arabic)" dir="rtl"><input className={inputClassName} dir="rtl" value={v.titleAr} onChange={(e) => set("titleAr", e.target.value)} placeholder="مثال: دهان فلل" /></Field>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Description (English)</span>
            <RichTextEditor value={v.descriptionEn} onChange={(x) => set("descriptionEn", x)} placeholder="Describe the work…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600" dir="rtl">الوصف (Arabic)</span>
            <RichTextEditor dir="rtl" value={v.descriptionAr} onChange={(x) => set("descriptionAr", x)} placeholder="صف العمل المطلوب…" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date"><input type="date" className={inputClassName} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />{err("startDate")}</Field>
          <Field label="Application deadline (Dubai time)"><input type="datetime-local" className={inputClassName} value={v.applicationDeadline} onChange={(e) => set("applicationDeadline", e.target.value)} />{err("applicationDeadline")}</Field>
        </div>
      </Section>

      <Section title="B. Location">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Emirate *">
            <select className={inputClassName} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
              {EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e].en} · {EMIRATE_LABEL[e].ar}</option>)}
            </select>
          </Field>
          <Field label="Area">
            <input className={inputClassName} list="job-areas" value={v.area} onChange={(e) => set("area", e.target.value)} placeholder="Type or pick a used area" />
            <datalist id="job-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          </Field>
          <Field label="Property type">
            <select className={inputClassName} value={v.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
              <option value="">—</option>
              {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{PROPERTY_LABEL[p].en} · {PROPERTY_LABEL[p].ar}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={daily ? "C. Terms (daily work)" : "C. Terms (permanent job)"}>
        {daily ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Daily wage per worker (AED)">
              <input className={inputClassName} inputMode="decimal" disabled={v.wageToBeAgreed} value={v.dailyWage} onChange={(e) => set("dailyWage", e.target.value)} placeholder="Optional" />
              {err("dailyWage")}
            </Field>
            <Field label="Number of working days"><input className={inputClassName} inputMode="numeric" value={v.workingDays} onChange={(e) => set("workingDays", e.target.value)} />{err("workingDays")}</Field>
            <Field label="Materials provided by">
              <select className={inputClassName} value={v.materialsBy} onChange={(e) => set("materialsBy", e.target.value)}>
                <option value="">—</option>
                {MATERIALS_BY.map((m) => <option key={m} value={m}>{MATERIALS_LABEL[m].en} · {MATERIALS_LABEL[m].ar}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monthly salary from (AED)"><input className={inputClassName} inputMode="decimal" disabled={v.wageToBeAgreed} value={v.monthlySalaryMin} onChange={(e) => set("monthlySalaryMin", e.target.value)} placeholder="Optional" />{err("monthlySalaryMin")}</Field>
            <Field label="Monthly salary to (AED)"><input className={inputClassName} inputMode="decimal" disabled={v.wageToBeAgreed} value={v.monthlySalaryMax} onChange={(e) => set("monthlySalaryMax", e.target.value)} placeholder="Optional" />{err("monthlySalaryMax")}</Field>
            <Field label="Working days per week"><input className={inputClassName} inputMode="numeric" value={v.workingDaysPerWeek} onChange={(e) => set("workingDaysPerWeek", e.target.value)} />{err("workingDaysPerWeek")}</Field>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={v.wageToBeAgreed} onChange={(e) => setV((cur) => ({ ...cur, wageToBeAgreed: e.target.checked, ...(e.target.checked ? { dailyWage: "", monthlySalaryMin: "", monthlySalaryMax: "" } : {}) }))} />
          {daily ? "Wage to be agreed (يتم الاتفاق)" : "Salary to be agreed (يتم الاتفاق)"} <span className="text-xs text-slate-400">— shown only when ticked; an empty wage shows nothing</span>
        </label>
        {err("wageToBeAgreed")}
        <Field label="Daily working hours"><input className={inputClassName} value={v.dailyHours} onChange={(e) => set("dailyHours", e.target.value)} placeholder="e.g. 8 hours or 8:00–17:00" /></Field>
        {!daily && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Requirements (English)"><textarea className={`${inputClassName} min-h-24`} value={v.requirementsEn} onChange={(e) => set("requirementsEn", e.target.value)} /></Field>
            <Field label="المتطلبات (Arabic)" dir="rtl"><textarea className={`${inputClassName} min-h-24`} dir="rtl" value={v.requirementsAr} onChange={(e) => set("requirementsAr", e.target.value)} /></Field>
          </div>
        )}
      </Section>

      {fields.length > 0 && (
        <Section title={`D. ${category?.nameEn} details`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const val = v.customFields[f.key];
              const update = (x: string | number | boolean) => setV((cur) => ({ ...cur, customFields: { ...cur.customFields, [f.key]: x } }));
              return (
                <Field key={f.id} label={`${f.labelEn} · ${f.labelAr}${f.required ? " *" : ""}`}>
                  {f.inputType === "select" ? (
                    <select className={inputClassName} value={String(val ?? "")} onChange={(e) => update(e.target.value)}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o.value} value={o.value}>{o.labelEn} · {o.labelAr}</option>)}
                    </select>
                  ) : f.inputType === "boolean" ? (
                    <input type="checkbox" className="h-5 w-5" checked={val === true} onChange={(e) => update(e.target.checked)} />
                  ) : (
                    <input className={inputClassName} inputMode={f.inputType === "number" ? "decimal" : undefined} value={String(val ?? "")} onChange={(e) => update(e.target.value)} />
                  )}
                </Field>
              );
            })}
          </div>
        </Section>
      )}

      {!locked && missing.length > 0 && <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800">Missing in one language: {missing.join(", ")}. You can save a draft like this; publishing will ask you to confirm.</p>}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur">
        <button type="button" disabled={pending || locked} onClick={saveDraft} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{pending ? "Working…" : "Save as Draft"}</button>
        <button type="button" disabled={pending || locked} onClick={preview} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Preview</button>
        {(!job || job.status === "DRAFT") && <button type="button" disabled={pending || locked} onClick={() => publish(false)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Publish</button>}
        {job && <span className="ms-auto text-xs text-slate-400">Job #{job.number}{job.slug ? ` · /jobs/${job.slug}` : " · the public address is created when you publish"}</span>}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="pub-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 id="pub-title" className="text-base font-bold text-slate-900">Some fields are missing in one language</h3>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">{confirm.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            <p className="mt-3 text-xs text-slate-500">If you publish anyway, the public page shows the available language with a small “available in one language only” note.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Go back and fill them</button>
              <button type="button" disabled={pending} onClick={() => publish(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Publish anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
