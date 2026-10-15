"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useToast } from "@/components/Toast";
import { generateLlmsDraft, saveTechnicalFile } from "@/app/admin/website/technical-actions";
import { AI_POLICIES, buildRobotsTxt, type AiPolicy } from "@/lib/site/technicalFiles";

type Initial = {
  aiPolicy: AiPolicy; robotsExtra: string;
  llms: { enabled: boolean; content: string }; ads: { enabled: boolean; content: string }; security: { enabled: boolean; content: string };
};

const mono = "w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-blue-400 min-h-40";
const SECURITY_TEMPLATE = "Contact: mailto:security@example.com\nExpires: 2027-12-31T23:59:59.000Z\nPreferred-Languages: en, ar\n";
const ADS_TEMPLATE = "# domain, publisher account id, DIRECT or RESELLER, certification id (optional)\n# google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n";

function Card({ title, path, origin, hint, children }: { title: string; path: string; origin: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <a href={`${origin}${path}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600" dir="ltr">{path} ↗</a>
      </div>
      <p className="mb-3 max-w-3xl text-sm text-slate-500">{hint}</p>
      {children}
    </section>
  );
}

export function TechnicalFilesManager({ origin, allowIndexing, canSeo, canOwner, initial }: { origin: string; allowIndexing: boolean; canSeo: boolean; canOwner: boolean; initial: Initial }) {
  const { showToast } = useToast();
  const [policy, setPolicy] = useState<AiPolicy>(initial.aiPolicy);
  const [robots, setRobots] = useState(initial.robotsExtra);
  const [llms, setLlms] = useState(initial.llms);
  const [ads, setAds] = useState(initial.ads);
  const [security, setSecurity] = useState(initial.security);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [pending, startTransition] = useTransition();

  function save(key: string, input: { enabled: boolean; content: string }, ok: string) {
    startTransition(async () => {
      setErrors((e) => ({ ...e, [key]: null }));
      const r = await saveTechnicalFile(key, input);
      if (r.ok) showToast(ok);
      else setErrors((e) => ({ ...e, [key]: r.error ?? "Could not save." }));
    });
  }
  const err = (k: string) => errors[k] && <p className="mt-2 text-sm text-red-600">{errors[k]}</p>;
  const saveBtn = (onClick: () => void, disabled = false) => (
    <button type="button" disabled={pending || disabled} onClick={onClick} className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
  );
  const toggle = (checked: boolean, on: (v: boolean) => void, disabled: boolean) => (
    <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => on(e.target.checked)} /> Publish this file</label>
  );

  const robotsPreview = buildRobotsTxt({ allowIndexing, aiPolicy: policy, extra: robots, sitemapUrl: `${origin}/sitemap.xml` });

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Card title="AI crawlers" path="/robots.txt" origin={origin} hint="Decide whether AI systems may read your website. This adds the matching rules to robots.txt. (Well-behaved crawlers follow it; it can't stop a crawler that ignores robots.txt.)">
        <div className="flex flex-col gap-2">
          {AI_POLICIES.map((p) => (
            <label key={p.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${policy === p.value ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
              <input type="radio" name="ai" className="mt-1" checked={policy === p.value} disabled={!canSeo} onChange={() => setPolicy(p.value)} />
              <span><b className="text-slate-900">{p.label}</b><span className="block text-xs text-slate-500">{p.hint}</span></span>
            </label>
          ))}
        </div>
        {err("ai-crawlers")}
        {saveBtn(() => save("ai-crawlers", { enabled: true, content: policy }, "AI crawler policy saved."), !canSeo)}
      </Card>

      <Card title="robots.txt" path="/robots.txt" origin={origin} hint="The standard rules (private pages, sitemap, your AI choice above) are added for you. Put any extra rules here, one per line (User-agent, Allow, Disallow, Crawl-delay), or lines starting with #.">
        {!allowIndexing && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Search engines are currently blocked in Site &amp; Contact (“Allow search engines to index the website” is off), so robots.txt tells every crawler to stay out.</p>}
        <textarea spellCheck={false} className={mono} value={robots} disabled={!canSeo} onChange={(e) => setRobots(e.target.value)} placeholder={"User-agent: SomeBot\nDisallow: /private/"} />
        {err("robots")}
        {saveBtn(() => save("robots", { enabled: true, content: robots }, "robots.txt saved."), !canSeo)}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">What visitors and crawlers will receive</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-100" dir="ltr">{robotsPreview}</pre>
        </details>
      </Card>

      <Card title="llms.txt" path="/llms.txt" origin={origin} hint="A short, readable guide for AI assistants: who you are, what you offer, where you work and which pages matter. Press Generate for a first draft from your site, then edit it.">
        {toggle(llms.enabled, (enabled) => setLlms({ ...llms, enabled }), !canSeo)}
        <textarea spellCheck={false} className={mono} value={llms.content} disabled={!canSeo} onChange={(e) => setLlms({ ...llms, content: e.target.value })} placeholder="# Your business…" />
        <div className="flex flex-wrap items-center gap-3">
          {saveBtn(() => save("llms", llms, llms.enabled ? "llms.txt saved and published." : "llms.txt saved (not published)."), !canSeo)}
          <button type="button" disabled={pending || !canSeo} onClick={() => startTransition(async () => { const r = await generateLlmsDraft(); if (r.ok && r.text) { setLlms((l) => ({ ...l, content: r.text! })); showToast("Draft generated: review it, then save."); } else showToast(r.error ?? "Could not generate.", "error"); })} className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Generate from my site</button>
        </div>
        {err("llms")}
      </Card>

      <Card title="ads.txt" path="/ads.txt" origin={origin} hint="Lists who is allowed to sell advertising on your site. Only needed if you show ads. Owner only.">
        {!canOwner && <p className="mb-3 text-xs text-slate-500">Only the Owner can change this file.</p>}
        {toggle(ads.enabled, (enabled) => setAds({ ...ads, enabled }), !canOwner)}
        <textarea spellCheck={false} className={mono} value={ads.content} disabled={!canOwner} onChange={(e) => setAds({ ...ads, content: e.target.value })} placeholder={ADS_TEMPLATE} />
        {!ads.content && canOwner && <button type="button" onClick={() => setAds({ ...ads, content: ADS_TEMPLATE })} className="mt-2 text-xs font-medium text-blue-600">Insert an example</button>}
        {err("ads")}
        {saveBtn(() => save("ads", ads, ads.enabled ? "ads.txt saved and published." : "ads.txt saved (not published)."), !canOwner)}
      </Card>

      <Card title="security.txt" path="/.well-known/security.txt" origin={origin} hint="Tells security researchers how to report a problem with your website (standard RFC 9116). Needs at least a Contact line. Owner only.">
        {!canOwner && <p className="mb-3 text-xs text-slate-500">Only the Owner can change this file.</p>}
        {toggle(security.enabled, (enabled) => setSecurity({ ...security, enabled }), !canOwner)}
        <textarea spellCheck={false} className={mono} value={security.content} disabled={!canOwner} onChange={(e) => setSecurity({ ...security, content: e.target.value })} placeholder={SECURITY_TEMPLATE} />
        {!security.content && canOwner && <button type="button" onClick={() => setSecurity({ ...security, content: SECURITY_TEMPLATE })} className="mt-2 text-xs font-medium text-blue-600">Insert an example</button>}
        {err("security")}
        {saveBtn(() => save("security", security, security.enabled ? "security.txt saved and published." : "security.txt saved (not published)."), !canOwner)}
      </Card>
    </div>
  );
}
