"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMIRATES, EMIRATE_LABEL } from "@/lib/jobs/constants";
import { tx, type Lang, type TextKey } from "@/lib/jobs/publicText";

type Skill = { key: string; label: string };
type Props = {
  slug: string; lang: Lang; skills: Skill[]; minPhotos: number; maxPhotos: number; maxFileMb: number; privacyUrl: string | null; preview?: boolean;
  turnstileSiteKey?: string | null;
};
type Photo = { id: string; preview: string; progress: number; status: "uploading" | "done" | "error"; token?: string; error?: string; file: File };

const MAX_SIDE = 2000;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Resizes a camera photo to at most 2000 px and re-encodes it as JPEG, so large originals fit the hosting request limit.
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

function upload(slug: string, blob: Blob, onProgress: (p: number) => void): Promise<{ token?: string; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("slug", slug);
    form.append("file", blob, "photo.jpg");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body?.data?.token) resolve({ token: body.data.token });
        else resolve({ error: body?.error?.message ?? "Upload failed." });
      } catch {
        resolve({ error: "Upload failed." });
      }
    };
    xhr.onerror = () => resolve({ error: "Network error." });
    xhr.open("POST", "/api/jobs/uploads");
    xhr.send(form);
  });
}

export function ApplyForm({ slug, lang, skills, minPhotos, maxPhotos, maxFileMb, privacyUrl, preview, turnstileSiteKey }: Props) {
  const t = (k: TextKey) => tx(lang, k);
  const [started] = useState(() => Date.now());
  // One key per form: pressing submit twice (or retrying after a lost response) can never create two applications.
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`));
  const photoSeq = useRef(0);
  const [v, setV] = useState({ fullName: "", phone: "", whatsapp: "", sameWa: true, preferredLang: lang as "ar" | "en" | "other", otherLang: "", emirate: "", area: "", otherSkills: "", experienceYears: "", notes: "", consent: false, website: "" });
  const [skillSel, setSkillSel] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string; duplicate?: boolean } | null>(null);
  const [captcha, setCaptcha] = useState("");
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((c) => ({ ...c, [k]: val }));
  const busy = photos.some((p) => p.status === "uploading");

  // Cloudflare Turnstile (only when configured).
  useEffect(() => {
    if (!turnstileSiteKey) return;
    (window as unknown as { __tsDone?: (t: string) => void }).__tsDone = (tok: string) => setCaptcha(tok);
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
    return () => s.remove();
  }, [turnstileSiteKey]);

  const addFiles = async (list: FileList | null) => {
    if (!list || preview) return;
    const room = maxPhotos - photos.length;
    const files = Array.from(list);
    if (files.length > room) setErrors((e) => ({ ...e, photoTokens: `${t("tooManyPhotos")}: ${maxPhotos}` }));
    for (const file of files.slice(0, Math.max(0, room))) {
      const id = `p${++photoSeq.current}`;
      const base = { id, file, preview: URL.createObjectURL(file), progress: 0 };
      if (!OK_TYPES.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
        setPhotos((p) => [...p, { ...base, status: "error", error: t("fileType") }]);
        continue;
      }
      if (file.size > maxFileMb * 1024 * 1024) {
        setPhotos((p) => [...p, { ...base, status: "error", error: `${t("fileTooLarge")} (${maxFileMb} MB)` }]);
        continue;
      }
      setPhotos((p) => [...p, { ...base, status: "uploading" }]);
      void send(id, file);
    }
  };

  const send = async (id: string, file: File) => {
    setPhotos((p) => p.map((x) => (x.id === id ? { ...x, status: "uploading", progress: 0, error: undefined } : x)));
    try {
      const blob = await compress(file);
      const res = await upload(slug, blob, (progress) => setPhotos((p) => p.map((x) => (x.id === id ? { ...x, progress } : x))));
      setPhotos((p) => p.map((x) => (x.id === id ? (res.token ? { ...x, status: "done", progress: 100, token: res.token } : { ...x, status: "error", error: res.error ?? t("genericError") }) : x)));
    } catch {
      setPhotos((p) => p.map((x) => (x.id === id ? { ...x, status: "error", error: t("fileType") } : x)));
    }
  };

  const remove = (id: string) => setPhotos((p) => p.filter((x) => x.id !== id));
  const tokens = useMemo(() => photos.filter((p) => p.status === "done" && p.token).map((p) => p.token!), [photos]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || sending) return;
    setFormError(null);
    const local: Record<string, string> = {};
    if (v.fullName.trim().length < 3) local.fullName = lang === "ar" ? "اكتب اسمك الكامل" : "Enter your full name";
    if (!v.phone.trim()) local.phone = lang === "ar" ? "أدخل رقم هاتفك" : "Enter your phone number";
    if (!v.sameWa && !v.whatsapp.trim()) local.whatsapp = lang === "ar" ? "أدخل رقم واتساب" : "Enter your WhatsApp number";
    if (!v.emirate) local.emirate = lang === "ar" ? "اختر الإمارة" : "Choose your emirate";
    if (v.preferredLang === "other" && !v.otherLang.trim()) local.otherLang = lang === "ar" ? "اكتب لغتك" : "Write your language";
    if (tokens.length < minPhotos) local.photoTokens = minPhotos === 1 ? t("minPhotos") : `${minPhotos}`;
    if (!v.consent) local.consent = lang === "ar" ? "الموافقة مطلوبة" : "Your agreement is required";
    if (Object.keys(local).length) {
      setErrors(local);
      document.getElementById(`field-${Object.keys(local)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, fullName: v.fullName, phone: v.phone, whatsappSameAsPhone: v.sameWa, whatsapp: v.whatsapp, preferredLang: v.preferredLang, otherLang: v.otherLang, emirate: v.emirate, area: v.area,
          skills: skillSel, otherSkills: v.otherSkills, experienceYears: v.experienceYears === "" ? null : Number(v.experienceYears), notes: v.notes, consent: true, photoTokens: tokens,
          idempotencyKey, website: v.website, elapsedMs: Date.now() - started, turnstileToken: captcha,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.data?.code) {
        setDone({ code: body.data.code });
      } else if (body?.error?.code === "duplicate") {
        setDone({ code: body.error.applicationCode ?? "", duplicate: true });
      } else {
        // Recoverable errors keep everything the visitor typed.
        if (body?.error?.fields) setErrors(body.error.fields);
        setFormError(body?.error?.message ?? t("genericError"));
      }
    } catch {
      setFormError(t("genericError"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center" role="status">
        <p className="text-5xl" aria-hidden>✅</p>
        <h2 className="mt-3 text-2xl font-extrabold text-emerald-800">{done.duplicate ? t("duplicate") : t("successTitle")}</h2>
        {!done.duplicate && <p className="mx-auto mt-3 max-w-xl leading-relaxed text-emerald-900">{t("successBody")}</p>}
        {done.code && <p className="mt-4 text-sm text-emerald-800">{t("yourCode")}: <b dir="ltr" className="font-mono text-base">{done.code}</b></p>}
        <Link href="/jobs" className="mt-5 inline-block rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white">{t("otherJobs")}</Link>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-1 text-sm text-red-600">{errors[k]}</p> : null);
  const label = "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-busy={sending}>
      <h2 className="text-xl font-extrabold text-slate-900">{t("formTitle")}</h2>
      {preview && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{lang === "ar" ? "النموذج معطّل في المعاينة." : "The form is disabled in preview."}</p>}
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website", e.target.value)} /></label></div>

      <fieldset disabled={preview} className="flex flex-col gap-5">
        <div id="field-fullName"><label className={label} htmlFor="fullName">{t("fullName")} *</label><input id="fullName" className={input} autoComplete="name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={80} />{err("fullName")}</div>
        <div id="field-phone"><label className={label} htmlFor="phone">{t("phone")} *</label><input id="phone" className={input} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="05X XXX XXXX" value={v.phone} onChange={(e) => set("phone", e.target.value)} style={{ textAlign: lang === "ar" ? "right" : "left" }} />{err("phone")}</div>
        <div id="field-whatsapp">
          <label className={label} htmlFor="wa">{t("whatsapp")} *</label>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="h-5 w-5" checked={v.sameWa} onChange={(e) => set("sameWa", e.target.checked)} /> {t("sameAsPhone")}</label>
          {!v.sameWa && <input id="wa" className={input} type="tel" inputMode="tel" dir="ltr" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={{ textAlign: lang === "ar" ? "right" : "left" }} />}
          {err("whatsapp")}
        </div>
        <div>
          <span className={label}>{t("preferredLang")}</span>
          <div className="flex flex-wrap gap-2">
            {(["ar", "en", "other"] as const).map((l) => (
              <label key={l} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium ${v.preferredLang === l ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                <input type="radio" name="plang" className="sr-only" checked={v.preferredLang === l} onChange={() => set("preferredLang", l)} />{t(l === "ar" ? "langAr" : l === "en" ? "langEn" : "langOther")}
              </label>
            ))}
          </div>
          {v.preferredLang === "other" && <input id="field-otherLang" className={`${input} mt-2`} placeholder={t("otherLang")} value={v.otherLang} onChange={(e) => set("otherLang", e.target.value)} maxLength={40} />}
          {err("otherLang")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div id="field-emirate"><label className={label} htmlFor="emirate">{t("currentEmirate")} *</label><select id="emirate" className={input} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}><option value="">{t("choose")}</option>{EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e][lang]}</option>)}</select>{err("emirate")}</div>
          <div><label className={label} htmlFor="area">{t("currentArea")} <span className="font-normal text-slate-400">({t("optional")})</span></label><input id="area" className={input} value={v.area} onChange={(e) => set("area", e.target.value)} maxLength={120} /></div>
        </div>
        <div>
          <span className={label}>{t("skills")}</span>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => {
              const on = skillSel.includes(s.key);
              return <button key={s.key} type="button" aria-pressed={on} onClick={() => setSkillSel((cur) => (on ? cur.filter((x) => x !== s.key) : [...cur, s.key]))} className={`rounded-full border px-4 py-2 text-sm font-medium ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{s.label}</button>;
            })}
          </div>
          <input className={`${input} mt-2`} placeholder={t("otherSkills")} value={v.otherSkills} onChange={(e) => set("otherSkills", e.target.value)} maxLength={200} />
        </div>
        <div><label className={label} htmlFor="exp">{t("experience")} <span className="font-normal text-slate-400">({t("optional")})</span></label><input id="exp" className={input} type="number" inputMode="numeric" min={0} max={50} dir="ltr" value={v.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} /></div>

        <div id="field-photoTokens">
          <span className={label}>{t("photos")} * <span className="font-normal text-slate-400">({photos.length}/{maxPhotos})</span></span>
          <p className="mb-2 text-sm text-slate-500">{t("photosHint")}</p>
          <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white">
                  {p.status === "uploading" && `${t("uploading")} ${p.progress}%`}
                  {p.status === "done" && `✓ ${t("uploaded")}`}
                  {p.status === "error" && <span className="text-red-200">{p.error}</span>}
                </div>
                {p.status === "uploading" && <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" style={{ width: `${p.progress}%` }} />}
                <div className="absolute end-1 top-1 flex gap-1">
                  {p.status === "error" && p.file.size <= maxFileMb * 1024 * 1024 && (OK_TYPES.includes(p.file.type) || /\.(jpe?g|png|webp)$/i.test(p.file.name)) && <button type="button" onClick={() => void send(p.id, p.file)} className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-blue-700">{t("retry")}</button>}
                  <button type="button" onClick={() => remove(p.id)} className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-red-600" aria-label={t("remove")}>✕</button>
                </div>
              </li>
            ))}
          </ul>
          {photos.length < maxPhotos && (
            <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-base font-semibold text-blue-700 hover:bg-blue-50">
              {t("addPhotos")}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
          {err("photoTokens")}
        </div>

        <div><label className={label} htmlFor="notes">{t("notes")} <span className="font-normal text-slate-400">({t("optional")})</span></label><textarea id="notes" className={`${input} min-h-24`} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} /></div>

        <div id="field-consent">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} />
            <span>{t("consent")}{privacyUrl && <> — <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">{t("privacyPolicy")}</a></>}</span>
          </label>
          {err("consent")}
        </div>

        {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="__tsDone" />}
      </fieldset>

      {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
      <button type="submit" disabled={sending || busy || preview} className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-60">
        {sending ? t("sending") : busy ? t("photosBusy") : t("submit")}
      </button>
      {busy && <p className="-mt-3 text-center text-xs text-slate-400">{t("waitUploads")}</p>}
    </form>
  );
}
