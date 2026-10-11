"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { saveIntegrations } from "@/app/admin/website/integrations-actions";
import { ID_HELP, needsConsent, type IntegrationInput } from "@/lib/site/integrationRules";

const Card = ({ title, consent, needs, children }: { title: string; consent: string; needs: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="mb-1 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">{consent}</span>
    </div>
    <p className="mb-3 text-xs text-slate-400"><b>You need:</b> {needs}</p>
    {children}
  </section>
);

export function IntegrationsForm({ initial }: { initial: IntegrationInput }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (p: Partial<IntegrationInput>) => setV((s) => ({ ...s, ...p }));
  const need = needsConsent(v);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card title="Google Tag Manager" consent="Needs analytics consent" needs="a GTM container ID and Publish access to that container. If you use GTM, set up GA4 inside GTM — the direct GA4 ID below is then ignored to avoid counting every visit twice.">
        <Field label={`Container ID (${ID_HELP.gtmId})`}><input className={inputClassName} dir="ltr" placeholder="GTM-XXXXXX" value={v.gtmId} onChange={(e) => set({ gtmId: e.target.value.trim() })} /></Field>
      </Card>

      <Card title="Google Analytics 4" consent="Needs analytics consent" needs="a GA4 property and its Measurement ID (Admin → Data streams → Web). Editor access is enough to read reports.">
        <Field label={`Measurement ID (${ID_HELP.ga4Id})`}><input className={inputClassName} dir="ltr" placeholder="G-XXXXXXXXXX" value={v.ga4Id} onChange={(e) => set({ ga4Id: e.target.value.trim() })} /></Field>
        {v.gtmId && v.ga4Id && <p className="mt-2 text-xs text-amber-600">GTM is set, so this direct GA4 tag will not load.</p>}
      </Card>

      <Card title="Meta (Facebook) Pixel" consent="Needs marketing consent" needs="a Meta Business account with a Pixel / dataset, and its numeric ID (Events Manager). Admin access to the Business account to create it.">
        <Field label={`Pixel ID (${ID_HELP.metaPixelId})`}><input className={inputClassName} dir="ltr" value={v.metaPixelId} onChange={(e) => set({ metaPixelId: e.target.value.trim() })} /></Field>
      </Card>

      <Card title="Google Search Console" consent="No cookies, no consent needed" needs="to be an Owner of the property in Search Console, using the “HTML tag” verification method. Paste only the content value.">
        <Field label="Verification token"><input className={inputClassName} dir="ltr" value={v.searchConsoleToken} onChange={(e) => set({ searchConsoleToken: e.target.value.trim() })} /></Field>
        <p className="mt-2 text-xs text-slate-400">Then submit <span className="font-mono">/sitemap.xml</span> inside Search Console.</p>
      </Card>

      <Card title="Bing Webmaster Tools" consent="No cookies, no consent needed" needs="a Bing Webmaster account and the “meta tag” verification code (the msvalidate.01 value).">
        <Field label="Verification code"><input className={inputClassName} dir="ltr" value={v.bingToken} onChange={(e) => set({ bingToken: e.target.value.trim() })} /></Field>
      </Card>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Cookie consent</h3>
        <p className="mb-3 text-xs text-slate-400">
          {need.analytics || need.marketing
            ? `A consent banner will be shown, and ${[need.analytics && "analytics", need.marketing && "marketing"].filter(Boolean).join(" and ")} scripts load only after the visitor agrees.`
            : "No analytics or marketing integration is set, so no banner is shown and nothing is loaded."}
        </p>
        <label className="mb-3 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={v.requireConsent} onChange={(e) => set({ requireConsent: e.target.checked })} />
          <span>Ask visitors before loading analytics or marketing scripts<span className="block text-xs text-slate-400">Recommended. Turning this off loads them for everyone immediately — only do that if you are sure the law where your visitors are allows it.</span></span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Banner message (English, optional)"><textarea className={`${inputClassName} min-h-20`} placeholder="Leave empty for the default text" value={v.consentTextEn} onChange={(e) => set({ consentTextEn: e.target.value })} /></Field>
          <Field label="رسالة اللافتة (Arabic, optional)" dir="rtl"><textarea className={`${inputClassName} min-h-20`} dir="rtl" value={v.consentTextAr} onChange={(e) => set({ consentTextAr: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><Field label="Privacy policy link (optional)"><input className={inputClassName} dir="ltr" placeholder="/privacy-policy" value={v.privacyUrl} onChange={(e) => set({ privacyUrl: e.target.value })} /></Field></div>
      </section>

      <p className="text-xs text-slate-400">Tracked automatically (when allowed): phone-number clicks, WhatsApp clicks, booking started, booking completed and form submissions.</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { setError(null); const res = await saveIntegrations(v); if (res.ok) showToast("Integrations saved."); else setError(res.error ?? "Could not save."); })}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save integrations"}
        </button>
      </div>
    </div>
  );
}
