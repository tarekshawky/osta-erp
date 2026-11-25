"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Download, Link2, Mail, MapPin, Plus, RefreshCw, ShieldAlert, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  addBacklink, checkBacklink, deleteBacklink, finishBacklinkScan, importBacklinks, markRemovalRequested, scanBacklinkBatch, setBacklinkDecision, startBacklinkScan,
  type BacklinkInput,
} from "@/app/admin/website/backlink-actions";
import { RATING_LABEL, disavowFile, isNew, outreachDraft, type Assessment, type Rating, type backlinkStats } from "@/lib/seo/backlinks";
import { BacklinkEditor } from "./BacklinkEditor";

export type MonitorRow = BacklinkInput & {
  id: string; sourceSite: string; origin: string; decision: string; httpStatus: number | null; lastCheckedAt: string; lastCheckNote: string;
  removalRequestedAt: string; lostAt: string; pageTitle: string; assessment: Assessment;
};
type Props = { rows: MonitorRow[]; stats: ReturnType<typeof backlinkStats>; lastScan: { at: string; summary: string } | null; today: string };

const FILTERS = ["all", "good", "neutral", "bad", "new", "lost"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = { all: "All", good: "Good", neutral: "Neutral", bad: "Bad", new: "New", lost: "Lost" };
const DOT: Record<Rating, string> = { good: "bg-emerald-500", neutral: "bg-amber-400", bad: "bg-red-400" };
const BAR: Record<Rating, string> = { good: "border-s-emerald-700", neutral: "border-s-amber-700", bad: "border-s-red-700" };
const PILL: Record<Rating, string> = { good: "bg-emerald-50 text-emerald-800", neutral: "bg-amber-50 text-amber-800", bad: "bg-red-50 text-red-800" };
const TAG = { good: "bg-emerald-50 text-emerald-800", neutral: "bg-amber-50 text-amber-800", bad: "bg-red-50 text-red-800" };
const STATUS_TAG: Record<string, [string, string]> = { PENDING: ["Not checked yet", "bg-slate-100 text-slate-600"], LOST: ["Lost", "bg-slate-800 text-white"], REJECTED: ["Ignored", "bg-slate-100 text-slate-500"] };
const act = "flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:shadow disabled:opacity-50";
const card = "rounded-2xl bg-white p-5 shadow-sm";
const PAGE = 50;

export function BacklinkMonitor({ rows, stats, lastScan, today }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [pending, start] = useTransition();
  const stop = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(`${today}T23:59:59Z`), [today]);

  const matches = (r: MonitorRow, f: Filter) =>
    f === "all" ? true : f === "lost" ? r.status === "LOST" : f === "new" ? isNew(r, now) : r.status !== "LOST" && r.status !== "REJECTED" && r.assessment.rating === f;
  const shown = rows.filter((r) => matches(r, filter) && (!q || `${r.sourceSite} ${r.sourceUrl} ${r.targetUrl} ${r.anchorText} ${r.campaign}`.toLowerCase().includes(q.toLowerCase())));
  const disavowed = [...new Set(rows.filter((r) => r.decision === "disavow").map((r) => r.sourceSite))].sort();

  const report = (r: { ok: boolean; note?: string; error?: string }, fallback = "Done.") => {
    const text = r.ok ? r.note ?? fallback : r.error ?? "Something went wrong.";
    setMessage({ ok: r.ok, text });
    showToast(text, r.ok ? "success" : "error");
    router.refresh();
  };

  async function scanNow() {
    setMessage(null);
    stop.current = false;
    setScan({ done: 0, total: 0 });
    const s = await startBacklinkScan();
    if (!s.ok || !s.scanId || !s.pages) { setScan(null); report(s, ""); return; }
    const size = s.batch ?? 5;
    setScan({ done: 0, total: s.pages.length });
    for (let i = 0; i < s.pages.length && !stop.current; i += size) {
      const r = await scanBacklinkBatch(s.scanId, s.pages.slice(i, i + size));
      if (!r.ok) { setMessage({ ok: false, text: r.error ?? "The scan stopped." }); break; }
      setScan({ done: Math.min(i + size, s.pages.length), total: s.pages.length });
    }
    const end = await finishBacklinkScan(s.scanId);
    setScan(null);
    report(end);
  }

  const decide = (ids: string[], d: "" | "keep" | "disavow") => start(async () => { const r = await setBacklinkDecision(ids, d); setPicked(new Set()); report(r, d === "disavow" ? "Added to the disavow list." : d === "keep" ? "Marked to keep." : "Decision cleared."); });
  const mail = (r: MonitorRow, kind: "contact" | "removal") => {
    const d = outreachDraft(kind, r.sourceUrl, r.targetUrl);
    // Opens the owner's own mail program with a draft. Nothing is sent from here.
    window.location.assign(`mailto:?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`);
    if (kind === "removal" && window.confirm("A draft e-mail was opened. Mark this link as “removal requested” once you send it?")) start(async () => report(await markRemovalRequested(r.id), "Marked as removal requested."));
  };
  const exportDisavow = () => {
    const blob = new Blob([disavowFile(disavowed, today)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "disavow.txt"; a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = stats.quality.good + stats.quality.neutral + stats.quality.bad;
  const rated = rows.filter((r) => r.status !== "LOST" && r.status !== "REJECTED");
  const average = rated.length ? Math.round(rated.reduce((a, r) => a + r.assessment.score, 0) / rated.length) : null;
  const C = 2 * Math.PI * 62;
  const arcs = (["good", "neutral", "bad"] as const).reduce<{ key: Rating; length: number; offset: number }[]>((list, key) => {
    const offset = list.reduce((a, x) => a + x.length, 0);
    return [...list, { key, length: total ? (stats.quality[key] / total) * C : 0, offset }];
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Backlink Monitor</h2>
          <p className="mt-1 text-sm text-slate-500">Find, rate and clean up the links pointing to ostaservices.com</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={scanNow} disabled={!!scan} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-70"><RefreshCw size={15} className={scan ? "animate-spin" : ""} /> {scan ? `Scanning pages ${scan.done}/${scan.total || "…"}` : "Scan now"}</button>
          {scan && <button type="button" onClick={() => { stop.current = true; }} className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">Stop</button>}
          <button type="button" onClick={() => file.current?.click()} disabled={pending} className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm"><Upload size={15} /> Import CSV</button>
          <input ref={file} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" aria-label="Import CSV file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) start(async () => report(await importBacklinks(await f.text()))); }} />
        </div>
      </div>
      {scan && scan.total > 0 && <div role="progressbar" aria-valuenow={scan.done} aria-valuemin={0} aria-valuemax={scan.total} className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all" style={{ width: `${(scan.done / scan.total) * 100}%` }} /></div>}
      {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([["Active backlinks", stats.active, Link2, "from-lime-400 to-green-700"], ["New backlinks (30 days)", stats.fresh, Sparkles, "from-violet-500 to-cyan-400"], ["Bad backlinks", stats.bad, ShieldAlert, "from-emerald-500 to-emerald-800"], ["Referring domains", stats.domains, MapPin, "from-emerald-400 to-teal-600"]] as const).map(([label, n, Icon, grad]) => (
          <div key={label} data-testid="stat" className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${grad}`}><Icon size={19} /></span>
            <span><span className="block text-2xl font-bold text-slate-900">{n}</span><span className="block text-xs text-slate-500">{label}</span></span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setLimit(PAGE); setPicked(new Set()); }} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
              {(f === "good" || f === "neutral" || f === "bad") && <span className={`h-2 w-2 rounded-full ${DOT[f]}`} />}{FILTER_LABEL[f]} <span className="font-normal opacity-60">{rows.filter((r) => matches(r, f)).length}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Source: your list, imports and live page checks (no discovery provider connected) · {lastScan ? `last scan ${lastScan.at}` : "never scanned"}</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <input type="search" aria-label="Search backlinks" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search domain, page, anchor or campaign…" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm" />
          {picked.size > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 p-3 text-white shadow-lg">
              <span className="text-sm font-bold">{picked.size} selected</span>
              <button type="button" className={act} disabled={pending} onClick={() => decide([...picked], "keep")}><Check size={13} /> Keep</button>
              <button type="button" className={act} disabled={pending} onClick={() => decide([...picked], "disavow")}><Ban size={13} /> Disavow</button>
              <button type="button" className={act} disabled={pending} onClick={() => { if (window.confirm(`Delete ${picked.size} record(s)? This cannot be undone.`)) start(async () => { for (const id of picked) await deleteBacklink(id); setPicked(new Set()); report({ ok: true, note: "Deleted." }); }); }}><Trash2 size={13} /> Delete</button>
              <button type="button" onClick={() => setPicked(new Set())} className="ms-auto text-xs text-slate-300">Clear</button>
            </div>
          )}
          {shown.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {rows.length === 0 ? <>No backlinks yet. Add one on the right, or press <strong>Import CSV</strong> with the file from Google Search Console (Links → Export external links → Latest links), Bing Webmaster Tools, Ahrefs or Semrush. Then press <strong>Scan now</strong>.</> : "No backlink matches this filter."}
            </div>
          )}
          {shown.slice(0, limit).map((r) => {
            const a = r.assessment;
            return (
              <article key={r.id} data-testid="backlink-card" className={`rounded-2xl border-s-8 bg-white p-4 shadow-sm ${BAR[a.rating]} ${r.status === "LOST" ? "opacity-75" : ""}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" aria-label={`Select ${r.sourceSite}`} checked={picked.has(r.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} className="mt-1 h-4 w-4" />
                  <div className="min-w-0 flex-1">
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" title={r.sourceUrl} className="font-bold text-slate-900 hover:text-blue-700">{r.sourceSite}</a>
                    <p className="truncate text-xs text-slate-500" title={r.sourceUrl} dir="ltr">{r.sourceUrl}</p>
                    <p className="mt-0.5 break-words text-sm text-slate-600">→ <span dir="ltr">{r.targetUrl || "target not known yet"}</span>{r.anchorText && <> · anchor “<bdi>{r.anchorText}</bdi>”</>}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${PILL[a.rating]}`}>{RATING_LABEL[a.rating]} <span className="ms-1.5">{a.score}</span></span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_TAG[r.status] && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TAG[r.status][1]}`}>{r.status === "PENDING" && r.lastCheckedAt ? "Could not be opened" : STATUS_TAG[r.status][0]}</span>}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{r.linkType === "dofollow" ? "DoFollow" : r.linkType === "nofollow" ? "NoFollow" : r.linkType === "sponsored" ? "Sponsored" : "UGC"}</span>
                    {a.tags.filter((t) => !["Nofollow", "Sponsored", "User content (ugc)"].includes(t.label)).map((t) => <span key={t.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TAG[t.tone]}`}>{t.label}</span>)}
                    {r.decision && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.decision === "keep" ? "bg-blue-50 text-blue-800" : "bg-red-600 text-white"}`}>{r.decision === "keep" ? "Kept" : "On disavow list"}</span>}
                    {r.removalRequestedAt && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800">Removal requested {r.removalRequestedAt}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.rating === "bad" ? <button type="button" className={act} onClick={() => mail(r, "removal")}><Mail size={13} /> Request removal</button> : <button type="button" className={act} disabled={pending} onClick={() => decide([r.id], r.decision === "keep" ? "" : "keep")}><Check size={13} /> {r.decision === "keep" ? "Kept ✕" : "Keep"}</button>}
                    {a.rating === "good" ? <button type="button" className={act} onClick={() => mail(r, "contact")}><Mail size={13} /> Contact</button> : <button type="button" className={`${act} ${a.rating === "bad" ? "!bg-red-50 !text-red-700" : ""}`} disabled={pending} onClick={() => decide([r.id], r.decision === "disavow" ? "" : "disavow")}><Ban size={13} /> {r.decision === "disavow" ? "Undo disavow" : "Disavow"}</button>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-400">
                  <span className="min-w-0">Found {r.discoveredAt}{r.lastCheckedAt ? ` · checked ${r.lastCheckedAt}: ${r.lastCheckNote}` : " · never checked"}{r.campaign ? ` · ${r.campaign}` : ""}{r.notes ? ` · ${r.notes}` : ""}</span>
                  <span className="flex gap-3">
                    <button type="button" disabled={busy === r.id || !!scan} onClick={async () => { setBusy(r.id); const x = await checkBacklink(r.id); setBusy(null); report(x); }} className="font-bold text-blue-600 disabled:opacity-50">{busy === r.id ? "Checking…" : "Check now"}</button>
                    <button type="button" onClick={() => setEditing(editing === r.id ? null : r.id)} className="font-bold text-slate-600">Edit</button>
                    <button type="button" onClick={() => { if (window.confirm(`Delete the record for ${r.sourceSite}?`)) start(async () => report(await deleteBacklink(r.id), "Deleted.")); }} className="font-bold text-red-600">Delete</button>
                  </span>
                </div>
                {editing === r.id && <BacklinkEditor id={r.id} initial={r} onDone={() => { setEditing(null); router.refresh(); }} />}
              </article>
            );
          })}
          {shown.length > limit && <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="self-center rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm">Show more ({shown.length - limit} left)</button>}
        </div>

        <aside className="flex flex-col gap-4">
          <section className={`${card} flex flex-col items-center`}>
            <svg viewBox="0 0 150 150" className="h-36 w-36" role="img" aria-label={`Link quality: ${stats.quality.good} good, ${stats.quality.neutral} neutral, ${stats.quality.bad} bad`}>
              <circle cx="75" cy="75" r="62" fill="none" stroke="#e8ecf8" strokeWidth="13" />
              {arcs.filter((x) => x.length > 0).map((x) => <circle key={x.key} cx="75" cy="75" r="62" fill="none" stroke={x.key === "good" ? "#22c55e" : x.key === "neutral" ? "#f59e0b" : "#f87171"} strokeWidth="13" strokeDasharray={`${x.length} ${C - x.length}`} strokeDashoffset={-x.offset} transform="rotate(-90 75 75)" />)}
              <text x="75" y="84" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 30, fontWeight: 700 }}>{average ?? "—"}</text>
            </svg>
            <p className="mt-2 text-sm font-bold text-slate-900">Link quality</p>
            <p className="mt-1 flex gap-3 text-xs text-slate-600">{(["good", "neutral", "bad"] as const).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT[k]}`} />{RATING_LABEL[k]} {stats.quality[k]}</span>)}</p>
            <p className="mt-3 text-center text-[11px] text-slate-400">Average score out of 100. The score is OSTA’s own rule of thumb from the reasons shown on each link. It is not a Google score.</p>
          </section>

          <section className={card}>
            <h3 className="text-sm font-bold text-slate-900">Disavow list</h3>
            <p className="mt-1 text-sm text-slate-500">{disavowed.length} domain{disavowed.length === 1 ? "" : "s"} · upload the file in Search Console</p>
            {disavowed.length > 0 && <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-600" dir="ltr">{disavowed.map((d) => <li key={d} className="flex items-center justify-between gap-2 py-0.5"><span className="truncate">{d}</span><button type="button" aria-label={`Remove ${d} from the disavow list`} onClick={() => decide(rows.filter((r) => r.sourceSite === d && r.decision === "disavow").map((r) => r.id), "")}><X size={12} /></button></li>)}</ul>}
            <button type="button" onClick={exportDisavow} disabled={!disavowed.length} className="mt-3 flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-40"><Download size={15} /> Export disavow.txt</button>
            <p className="mt-2 text-[11px] text-slate-400">Disavowing a whole domain can hurt your ranking if the links are fine. Google advises it mainly for spammy or paid links. Review the list before uploading.</p>
          </section>

          <section className={card}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Add a backlink</h3>
            <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addBacklink(source, target); if (r.ok) { setSource(""); setTarget(""); } report(r); }); }} className="flex flex-col gap-2">
              <input aria-label="Source URL" dir="ltr" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm" />
              <input aria-label="Target page" dir="ltr" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target page (optional)" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm" />
              <button type="submit" disabled={pending || !source.trim()} className="flex items-center justify-center gap-2 rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={15} /> {pending ? "Working…" : "Add"}</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
