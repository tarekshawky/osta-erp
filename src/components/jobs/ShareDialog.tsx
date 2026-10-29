"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { whatsappShareUrl } from "@/lib/jobs/adText";

// "Share Job / مشاركة الوظيفة": the ad text built from the job's real data (editable here, not saved), the public link,
// and WhatsApp sharing. Posting to WhatsApp groups is done by the admin through this link.
export function ShareDialog({ texts, url, onClose }: { texts: { ar: string; en: string }; url: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [drafts, setDrafts] = useState(texts);
  const text = drafts[lang];

  async function copy(value: string, ok: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(ok);
    } catch {
      showToast("Could not copy. Select the text and copy it by hand.", "error");
    }
  }

  async function shareWhatsApp() {
    // Phones: the system share sheet (WhatsApp is in it). Computers: WhatsApp Web / app through wa.me.
    if (typeof navigator !== "undefined" && "share" in navigator && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled: fall through to wa.me */
      }
    }
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col gap-3 overflow-auto rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 id="share-title" className="text-base font-bold text-slate-900">Share Job <span className="text-slate-400">· مشاركة الوظيفة</span></h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>
        <div role="tablist" className="inline-flex w-fit overflow-hidden rounded-lg border border-slate-200">
          {(["ar", "en"] as const).map((l) => (
            <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={`px-4 py-1.5 text-sm font-medium ${lang === l ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>{l === "ar" ? "العربية" : "English"}</button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Public link
          <input readOnly dir="ltr" value={url} onFocus={(e) => e.currentTarget.select()} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Ad text (you can edit it here; changes are not saved to the job)
          <textarea value={text} dir={lang === "ar" ? "rtl" : "ltr"} onChange={(e) => setDrafts((d) => ({ ...d, [lang]: e.target.value }))} rows={15} className="rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-800" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy(text, "Text copied")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Copy text</button>
          <button type="button" onClick={() => void copy(url, "Link copied")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Copy link</button>
          <button type="button" onClick={() => void shareWhatsApp()} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">Share on WhatsApp</button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-slate-50">Open job page</a>
        </div>
      </div>
    </div>
  );
}
