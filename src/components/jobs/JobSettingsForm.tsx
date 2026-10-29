"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveJobSettings } from "@/app/admin/jobs/settings/settings-actions";

type Skill = { key: string; labelEn: string; labelAr: string; active: boolean };
export type SettingsDto = { minPhotos: number; maxPhotos: number; maxFileMb: number; notifyEmail: boolean; notifyRecipients: string[]; emailDigest: boolean; retentionMonths: number; skills: Skill[]; areas: string[] };

const slugKey = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function JobSettingsForm({ initial }: { initial: SettingsDto }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({ ...initial, recipients: initial.notifyRecipients.join(", "), areasText: initial.areas.join("\n") });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((c) => ({ ...c, [k]: val }));
  const setSkill = (i: number, patch: Partial<Skill>) => set("skills", v.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function save() {
    startTransition(async () => {
      const res = await saveJobSettings({
        minPhotos: Number(v.minPhotos), maxPhotos: Number(v.maxPhotos), maxFileMb: Number(v.maxFileMb), notifyEmail: v.notifyEmail, emailDigest: v.emailDigest, retentionMonths: Number(v.retentionMonths),
        notifyRecipients: v.recipients.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean),
        skills: v.skills, areas: v.areasText.split("\n").map((x) => x.trim()).filter(Boolean),
      });
      if (res.ok) {
        showToast("Settings saved");
        router.refresh();
      } else showToast(res.error ?? "Could not save the settings.", "error");
    });
  }

  const box = "rounded-xl border border-slate-200 bg-white p-5";
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <section className={box}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Photo uploads (application form)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum photos required"><input className={inputClassName} inputMode="numeric" value={v.minPhotos} onChange={(e) => set("minPhotos", e.target.value as never)} /></Field>
          <Field label="Maximum photos (up to 5)"><input className={inputClassName} inputMode="numeric" value={v.maxPhotos} onChange={(e) => set("maxPhotos", e.target.value as never)} /></Field>
          <Field label="Maximum size per photo (MB)"><input className={inputClassName} inputMode="numeric" value={v.maxFileMb} onChange={(e) => set("maxFileMb", e.target.value as never)} /></Field>
        </div>
        <p className="mt-2 text-xs text-slate-400">Photos are resized to 2000 px in the applicant&apos;s browser before upload, so large camera photos still go through the hosting request limit.</p>
      </section>

      <section className={box}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Notifications</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.notifyEmail} onChange={(e) => set("notifyEmail", e.target.checked)} /> Email me about new applications</label>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={v.emailDigest} onChange={(e) => set("emailDigest", e.target.checked)} /> Daily digest instead of one email per application</label>
        <div className="mt-3"><Field label="Recipients (comma separated)"><input className={inputClassName} dir="ltr" value={v.recipients} onChange={(e) => set("recipients", e.target.value)} placeholder="hr@example.com, owner@example.com" /></Field></div>
        <p className="mt-2 text-xs text-slate-400">In-app notifications (the bell) are always on. Email needs email delivery to be set up on the server; otherwise emails are only logged.</p>
      </section>

      <section className={box}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Data retention</h3>
        <Field label="Delete photos and anonymise applicants who were not accepted, this many months after the job is completed"><input className={`${inputClassName} max-w-32`} inputMode="numeric" value={v.retentionMonths} onChange={(e) => set("retentionMonths", e.target.value as never)} /></Field>
        <p className="mt-2 text-xs text-slate-400">Runs daily. Applicants with an Accepted application are kept. Individual requests: Workers → worker → Delete applicant data.</p>
      </section>

      <section className={box}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Applicant skills</h3>
        <ul className="flex flex-col gap-2">
          {v.skills.map((s, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
              <input className={inputClassName} value={s.labelEn} onChange={(e) => setSkill(i, { labelEn: e.target.value, ...(initial.skills.some((x) => x.key === s.key) ? {} : { key: slugKey(e.target.value) }) })} placeholder="English" aria-label="Skill (English)" />
              <input className={inputClassName} dir="rtl" value={s.labelAr} onChange={(e) => setSkill(i, { labelAr: e.target.value })} placeholder="العربية" aria-label="Skill (Arabic)" />
              <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={s.active} onChange={(e) => setSkill(i, { active: e.target.checked })} /> On</label>
              <button type="button" onClick={() => set("skills", v.skills.filter((_, idx) => idx !== i))} className="text-xs text-red-600">Remove</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => set("skills", [...v.skills, { key: "", labelEn: "", labelAr: "", active: true }])} className="mt-3 text-sm font-medium text-blue-600">+ Add skill</button>
      </section>

      <section className={box}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Area suggestions</h3>
        <textarea className={`${inputClassName} min-h-28`} value={v.areasText} onChange={(e) => set("areasText", e.target.value)} placeholder={"One area per line, e.g.\nAl Nuaimiya\nAl Rashidiya"} />
        <p className="mt-2 text-xs text-slate-400">Suggestions for the job form&apos;s Area box. Areas already used on jobs are suggested too.</p>
      </section>

      <div><button type="button" disabled={pending} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "Saving…" : "Save settings"}</button></div>
    </div>
  );
}
