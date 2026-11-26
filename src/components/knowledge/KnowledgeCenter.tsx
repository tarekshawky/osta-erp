"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, Link2, Lock, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { deleteEntry, deleteSection, loadStartingContent, moveSection, saveEntry, saveSection, setEntryChecked, setPublicPage, setSectionVisible, type KnowledgeResult } from "@/app/admin/website/knowledge/actions";
import type { EntryView, KnowledgeCenterData, SectionView } from "@/lib/knowledge/data";
import { AUTO_SOURCES, ENTRY_TYPES, STATE_LABEL, TYPE_LABEL, entryProblems, entryState, isAutoSource, isPublicEntry, textChanged, type EntryInput, type EntryState, type EntryType } from "@/lib/knowledge/knowledge";

const CARD = "rounded-3xl bg-white shadow-lg shadow-indigo-900/5";
const FIELD = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#10163a] outline-none focus:border-[#4a7dff]";
const PRIMARY = "flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4a7dff] to-[#2a50c8] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 disabled:opacity-50";
const SOFT = "flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#10163a] shadow-md shadow-indigo-900/10 disabled:opacity-50";
const STATE_STYLE: Record<EntryState, string> = { incomplete: "bg-amber-50 text-amber-700", unchecked: "bg-slate-100 text-slate-600", old: "bg-orange-50 text-orange-700", checked: "bg-emerald-50 text-emerald-700" };

const DEFAULT_TYPE: Record<string, EntryType> = { company: "FACT", services: "SERVICE", areas: "AREA", policies: "POLICY", faq: "FAQ", guides: "GUIDE", comparisons: "COMPARISON", profiles: "PROFILE" };
const blank = (s: SectionView): EntryInput => ({ type: DEFAULT_TYPE[s.key] ?? "FACT", sectionId: s.id, titleEn: "", titleAr: "", bodyEn: "", bodyAr: "", sourceUrl: "", visible: true, schemaOn: true, note: "" });
const toInput = (e: EntryView): EntryInput => ({ type: e.type, sectionId: e.sectionId, titleEn: e.titleEn, titleAr: e.titleAr, bodyEn: e.bodyEn, bodyAr: e.bodyAr, sourceUrl: e.sourceUrl, visible: e.visible, schemaOn: e.schemaOn, note: e.note });
const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" }).format(new Date(iso));

function Switch({ on, label, disabled, onClick }: { on: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-[#3a63dd]" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function KnowledgeCenter({ data, canPublish }: { data: KnowledgeCenterData; canPublish: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"entries" | "preview">("entries");
  const [sectionId, setSectionId] = useState(data.sections[0]?.id ?? "");
  // The open editor: an existing entry ("id"), a new one ("new"), or nothing.
  const [open, setOpen] = useState<{ id: string | "new"; form: EntryInput } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [naming, setNaming] = useState<{ id: string | null; en: string; ar: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const now = new Date(data.now);

  // The editor sits under the section's list, which can be long: bring it into view when an entry is opened.
  const editor = useRef<HTMLElement>(null);
  const openId = open?.id;
  useEffect(() => {
    if (openId) editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openId]);

  const section = data.sections.find((s) => s.id === sectionId) ?? data.sections[0];
  const saved = open && open.id !== "new" ? data.sections.flatMap((s) => s.entries).find((e) => e.id === open.id) ?? null : null;
  const dirty = !!open && (open.id === "new" ? !!(open.form.titleEn || open.form.titleAr || open.form.bodyEn || open.form.bodyAr) : !!saved && JSON.stringify(toInput(saved)) !== JSON.stringify(open.form));
  const leave = () => !dirty || window.confirm("Leave without saving your changes?");

  const run = (action: () => Promise<KnowledgeResult>, success: string, after?: (r: KnowledgeResult) => void) => {
    setMessage(null);
    start(async () => {
      const r = await action().catch(() => ({ ok: false, error: "Could not reach the server. Try again." }) as KnowledgeResult);
      if (!r.ok) { setMessage({ ok: false, text: r.error ?? "Something went wrong." }); return; }
      setMessage({ ok: true, text: success });
      after?.(r);
      router.refresh();
    });
  };

  if (!data.sections.length) {
    return (
      <div className={`${CARD} mt-6 flex flex-col items-center gap-4 px-6 py-14 text-center`}>
        <h2 className="text-xl font-bold text-[#10163a]">Start with the prepared content</h2>
        <p className="max-w-xl text-sm text-[#6b7399]">It adds the sections and the entries from your knowledge base file and published policies. Nothing is public until you read an entry and mark it as checked.</p>
        <button type="button" disabled={pending} onClick={() => run(loadStartingContent, "Starting content added.")} className={PRIMARY}><Plus size={16} /> {pending ? "Adding…" : "Load starting content"}</button>
        {message && !message.ok && <p role="alert" className="text-sm text-red-600">{message.text}</p>}
      </div>
    );
  }

  const pick = (id: string) => { if (id !== sectionId && leave()) { setSectionId(id); setOpen(null); setMessage(null); setNaming(null); } };
  const edit = (e: EntryView) => { if (open?.id !== e.id && leave()) { setOpen({ id: e.id, form: toInput(e) }); setMessage(null); } };
  const set = (patch: Partial<EntryInput>) => setOpen((o) => (o ? { ...o, form: { ...o.form, ...patch } } : o));
  const passed = data.checks.filter((c) => c.ok).length;
  const around = 2 * Math.PI * 52;

  const form = open?.form;
  const problems = form ? entryProblems(form) : [];
  const willUncheck = !!saved?.verifiedAt && !!form && textChanged(saved, form);
  const faq = form?.type === "FAQ";

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["entries", "preview"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 text-xs font-bold shadow-sm shadow-indigo-900/5 ${tab === t ? "bg-[#10163a] text-white" : "bg-white text-[#10163a]"}`}>{t === "entries" ? "Entries" : "Preview"}</button>
        ))}
        {tab === "entries" && section && (
          <button type="button" onClick={() => { if (leave()) { setOpen({ id: "new", form: blank(section) }); setMessage(null); } }} className={`${PRIMARY} ml-auto`}><Plus size={16} /> New entry</button>
        )}
      </div>
      {message && <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-2xl px-4 py-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}

      {tab === "preview" ? (
        <section className={`${CARD} mt-4 p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#10163a]">llms.txt from what is public now</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#6b7399]">Only lines read from other screens and checked entries are in it. Copying does not publish anything; to publish, paste it on Technical files. Paths that start with / point to {data.origin}.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => navigator.clipboard.writeText(data.llmsText).then(() => setCopied(true)).catch(() => setMessage({ ok: false, text: "Copying was blocked. Select the text and copy it." }))} className={SOFT}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
              <Link href="/admin/website/technical" className={SOFT}><Link2 size={14} /> Technical files</Link>
            </div>
          </div>
          <pre dir="ltr" data-testid="llms-preview" className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#10163a] p-5 text-xs leading-6 text-slate-100">{data.llmsText}</pre>
        </section>
      ) : (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]">
          {/* Sections */}
          <nav aria-label="Sections" className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-bold text-[#10163a]">Sections</h2>
            {data.sections.map((s, i) => {
              const checked = s.entries.filter((e) => isPublicEntry(e, true)).length;
              const current = s.id === section?.id;
              return (
                <div key={s.id} className={`flex items-center gap-2 rounded-2xl bg-white py-2.5 pl-3 pr-3 shadow-sm shadow-indigo-900/5 ${current ? "ring-2 ring-[#4a7dff]" : ""}`}>
                  <span className="flex flex-col">
                    <button type="button" aria-label={`Move ${s.titleEn} up`} disabled={i === 0 || pending} onClick={() => run(() => moveSection(s.id, -1), "Moved.")} className="text-slate-400 hover:text-[#10163a] disabled:opacity-20"><ArrowUp size={12} /></button>
                    <button type="button" aria-label={`Move ${s.titleEn} down`} disabled={i === data.sections.length - 1 || pending} onClick={() => run(() => moveSection(s.id, 1), "Moved.")} className="text-slate-400 hover:text-[#10163a] disabled:opacity-20"><ArrowDown size={12} /></button>
                  </span>
                  <button type="button" aria-current={current || undefined} onClick={() => pick(s.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold leading-5 text-[#10163a]">{s.titleEn}</span>
                    <span className="block text-[11px] text-[#6b7399]">{[s.auto ? `auto ${s.autoLines.length}` : "", s.entries.length || !s.auto ? `${checked}/${s.entries.length} checked` : ""].filter(Boolean).join(" · ")}</span>
                  </button>
                  <Switch on={s.visible} label={`Show the section ${s.titleEn}`} disabled={!canPublish || pending} onClick={() => run(() => setSectionVisible(s.id, !s.visible), s.visible ? "Section hidden." : "Section shown.")} />
                </div>
              );
            })}
            <button type="button" onClick={() => setNaming({ id: null, en: "", ar: "" })} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 py-3 text-sm font-bold text-[#10163a]"><Plus size={15} /> Add section</button>
            {naming && (
              <form className={`${CARD} flex flex-col gap-2 p-3`} onSubmit={(ev) => { ev.preventDefault(); run(() => saveSection(naming.id, naming.en, naming.ar), "Section saved.", (r) => { setNaming(null); if (r.id) setSectionId(r.id); }); }}>
                <input autoFocus aria-label="Section name in English" placeholder="Name in English" value={naming.en} onChange={(ev) => setNaming({ ...naming, en: ev.target.value })} className={FIELD} />
                <input dir="rtl" aria-label="Section name in Arabic" placeholder="الاسم بالعربي" value={naming.ar} onChange={(ev) => setNaming({ ...naming, ar: ev.target.value })} className={FIELD} />
                <div className="flex gap-2"><button type="submit" disabled={pending} className={PRIMARY}>Save</button><button type="button" onClick={() => setNaming(null)} className={SOFT}>Cancel</button></div>
              </form>
            )}
          </nav>

          {/* The open section: its lines and the editor */}
          <div className="flex min-w-0 flex-col gap-4">
            {section && (
              <section className={`${CARD} p-5`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mr-auto text-base font-bold text-[#10163a]">{section.titleEn} <span className="font-normal text-[#6b7399]">· <bdi dir="rtl">{section.titleAr}</bdi></span></h2>
                  <button type="button" onClick={() => setNaming({ id: section.id, en: section.titleEn, ar: section.titleAr })} className={SOFT}><Pencil size={13} /> Rename</button>
                  {!section.auto && !section.entries.length && <button type="button" disabled={pending} onClick={() => window.confirm(`Delete the section “${section.titleEn}”?`) && run(() => deleteSection(section.id), "Section deleted.", () => setSectionId(data.sections[0]?.id ?? ""))} className={`${SOFT} text-red-700`}><Trash2 size={13} /> Delete section</button>}
                </div>
                {!section.visible && <p className="mt-2 text-xs font-semibold text-amber-700">This section is switched off: nothing in it is public.</p>}

                {section.auto && isAutoSource(section.auto) && (
                  <div className="mt-3 rounded-2xl bg-[#f4f6fe] p-4">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#10163a]"><Lock size={13} /> {AUTO_SOURCES[section.auto].label}<Link href={AUTO_SOURCES[section.auto].href} className="ml-auto text-[#2a50c8]">Edit there</Link></p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {section.autoLines.map((l) => <li key={l.id} className="text-sm text-[#10163a]"><span className="font-semibold">{l.titleEn}:</span> <span className="whitespace-pre-line text-[#4a5380]">{l.bodyEn}</span></li>)}
                      {!section.autoLines.length && <li className="text-sm text-[#6b7399]">Nothing there yet.</li>}
                    </ul>
                  </div>
                )}

                <ul className="mt-3 flex flex-col gap-1.5">
                  {section.entries.map((e) => {
                    const state = entryState(e, now);
                    return (
                      <li key={e.id}>
                        <button type="button" onClick={() => edit(e)} aria-current={open?.id === e.id || undefined} className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left ${open?.id === e.id ? "border-[#4a7dff] bg-[#f4f6fe]" : "border-slate-100 hover:bg-slate-50"}`}>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{TYPE_LABEL[e.type as EntryType] ?? e.type}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#10163a]">{e.titleEn}</span>
                          {!e.visible && <EyeOff size={14} className="shrink-0 text-slate-400" aria-label="Hidden" />}
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_STYLE[state]}`}>{STATE_LABEL[state]}</span>
                        </button>
                      </li>
                    );
                  })}
                  {!section.entries.length && !section.auto && <li className="py-3 text-sm text-[#6b7399]">No entries yet. Press New entry.</li>}
                </ul>
              </section>
            )}

            {open && form && (
              <section ref={editor} aria-label="Edit entry" className={`${CARD} scroll-mt-4 p-5`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="mr-auto text-base font-bold text-[#10163a]">{open.id === "new" ? "New entry" : "Edit entry"}</h2>
                  {saved && <button type="button" disabled={pending} onClick={() => window.confirm(`Delete “${saved.titleEn}”? This cannot be undone.`) && run(() => deleteEntry(saved.id), "Entry deleted.", () => setOpen(null))} className={`${SOFT} text-red-700`}><Trash2 size={14} /> Delete</button>}
                  <button type="button" disabled={pending || !dirty} onClick={() => run(() => saveEntry(open.id === "new" ? null : open.id, form), willUncheck ? "Saved. The text changed, so it needs checking again." : "Saved.", (r) => { setSectionId(form.sectionId); if (r.id) setOpen({ id: r.id, form: { ...form, titleEn: form.titleEn.trim(), titleAr: form.titleAr.trim(), bodyEn: form.bodyEn.trim(), bodyAr: form.bodyAr.trim(), sourceUrl: form.sourceUrl.trim(), note: form.note.trim() } }); })} className={PRIMARY}><Check size={15} /> {pending ? "Working…" : "Save"}</button>
                  <button type="button" aria-label="Close the editor" onClick={() => { if (leave()) setOpen(null); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                </div>

                <div role="radiogroup" aria-label="Kind of entry" className="mt-3 flex flex-wrap gap-1.5">
                  {ENTRY_TYPES.map((t) => <button key={t} type="button" role="radio" aria-checked={form.type === t} onClick={() => set({ type: t })} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${form.type === t ? "bg-[#10163a] text-white" : "bg-white text-[#10163a] shadow-sm shadow-indigo-900/10"}`}>{TYPE_LABEL[t]}</button>)}
                </div>

                <div className="mt-4 flex flex-col gap-3 text-xs font-bold text-[#6b7399]">
                  <label className="flex flex-col gap-1.5">{faq ? "Question" : "Title"} · English<input value={form.titleEn} onChange={(ev) => set({ titleEn: ev.target.value })} className={FIELD} /></label>
                  <label className="flex flex-col gap-1.5">{faq ? "Question" : "Title"} · العربية<input dir="rtl" value={form.titleAr} onChange={(ev) => set({ titleAr: ev.target.value })} className={FIELD} /></label>
                  <label className="flex flex-col gap-1.5">{faq ? "Answer" : "Text"} · English<textarea rows={3} value={form.bodyEn} onChange={(ev) => set({ bodyEn: ev.target.value })} className={FIELD} /></label>
                  <label className="flex flex-col gap-1.5">{faq ? "Answer" : "Text"} · العربية<textarea dir="rtl" rows={3} value={form.bodyAr} onChange={(ev) => set({ bodyAr: ev.target.value })} className={FIELD} /></label>
                  <label className="flex flex-col gap-1.5">Source page<input dir="ltr" value={form.sourceUrl} onChange={(ev) => set({ sourceUrl: ev.target.value })} placeholder="https://… or /page" className={FIELD} /></label>
                  <label className="flex flex-col gap-1.5">Section<select value={form.sectionId} onChange={(ev) => set({ sectionId: ev.target.value })} className={FIELD}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.titleEn}</option>)}</select></label>
                  <label className="flex flex-col gap-1.5">Private note (never public)<textarea rows={2} value={form.note} onChange={(ev) => set({ note: ev.target.value })} className={`${FIELD} bg-amber-50/60`} /></label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" aria-pressed={form.visible} onClick={() => set({ visible: !form.visible })} className={SOFT}>{form.visible ? <Eye size={14} /> : <EyeOff size={14} />} {form.visible ? "Visible" : "Hidden"}</button>
                  <button type="button" aria-pressed={form.schemaOn} onClick={() => set({ schemaOn: !form.schemaOn })} title="Used by the public page, which is the next phase" className={`${SOFT} ${form.schemaOn ? "!bg-emerald-50 text-emerald-800" : ""}`}>Structured data: {form.schemaOn ? "on" : "off"}</button>
                </div>

                <div className="mt-4 rounded-2xl bg-[#f4f6fe] p-4">
                  {problems.length > 0 && <ul className="flex flex-col gap-1 text-sm text-amber-800">{problems.map((p) => <li key={p} className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{p}</li>)}</ul>}
                  {willUncheck && <p className="text-sm text-amber-800">You changed the checked text. Saving removes the check.</p>}
                  {saved?.verifiedAt && !willUncheck ? (
                    <p className="flex flex-wrap items-center gap-2 text-sm text-emerald-800"><Check size={15} /> Checked on {day(saved.verifiedAt)} by {saved.verifiedByName}.{isPublicEntry(saved, !!data.sections.find((s) => s.id === saved.sectionId)?.visible) ? " It is public." : " It is hidden, so not public."}
                      {canPublish && <><button type="button" disabled={pending || dirty} onClick={() => run(() => setEntryChecked(saved.id, true, saved.updatedAt), "Checked again today.")} className={`${SOFT} ml-auto`}><RefreshCw size={13} /> Check again</button><button type="button" disabled={pending || dirty} onClick={() => run(() => setEntryChecked(saved.id, false, saved.updatedAt), "Check removed.")} className={SOFT}>Remove check</button></>}
                    </p>
                  ) : !problems.length && !willUncheck ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="mr-auto text-sm text-[#10163a]">{!saved || dirty ? "Save first, then mark it as checked." : "Read both languages and open the source page, then confirm."}</p>
                      {canPublish ? <button type="button" disabled={pending || dirty || !saved} onClick={() => saved && run(() => setEntryChecked(saved.id, true, saved.updatedAt), saved.visible ? "Checked. It is now public." : "Checked.")} className={PRIMARY}><Check size={15} /> I checked this text</button> : <p className="text-sm text-[#6b7399]">Only someone who may publish pages can mark it as checked.</p>}
                    </div>
                  ) : null}
                  {form.sourceUrl.trim().startsWith("https://") && <a href={form.sourceUrl.trim()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#2a50c8]"><Link2 size={13} /> Open the source page</a>}
                </div>
              </section>
            )}
          </div>

          {/* Readiness and what is synced */}
          <aside className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
            <section aria-label="Public page" className={`${CARD} p-5`}>
              <div className="flex items-center gap-3">
                <h2 className="mr-auto text-sm font-bold text-[#10163a]">Public page</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${data.page.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{data.page.enabled ? "on" : "off"}</span>
                <Switch on={data.page.enabled} label="Show the public Knowledge Center page" disabled={!canPublish || pending}
                  onClick={() => {
                    if (!data.page.enabled && !window.confirm(`Open the public page? Visitors will see ${data.page.checked} checked ${data.page.checked === 1 ? "entry" : "entries"} and ${data.page.synced} lines read from other screens. It stays hidden from search engines until you allow indexing.`)) return;
                    run(() => setPublicPage(!data.page.enabled, false), data.page.enabled ? "The public page is off." : "The public page is open. Search engines are asked not to index it.");
                  }} />
              </div>
              <p className="mt-1 text-xs text-[#6b7399]">{data.page.checked} checked · {data.page.synced} synced. The page and /knowledge.json show only these.</p>
              <div className="mt-3 flex items-center gap-3 text-sm text-[#10163a]">
                <span className="mr-auto">Let Google and AI assistants index it</span>
                <Switch on={data.page.indexable} label="Let search engines and AI assistants index the page" disabled={!canPublish || pending || !data.page.enabled}
                  onClick={() => {
                    if (!data.page.indexable && !window.confirm("Allow indexing? Do this only when this website is the one you want Google and AI assistants to quote.")) return;
                    run(() => setPublicPage(true, !data.page.indexable), data.page.indexable ? "Indexing is not allowed." : "Indexing is allowed.");
                  }} />
              </div>
              {data.page.enabled && <a href={data.page.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#2a50c8]"><Link2 size={13} /> Open the public page</a>}
            </section>
            <section aria-label="AI readiness" className={`${CARD} p-5`}>
              <div className="relative mx-auto h-32 w-32">
                <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
                  <circle cx="64" cy="64" r="52" fill="none" stroke="#e9edfb" strokeWidth="14" />
                  {passed > 0 && <circle cx="64" cy="64" r="52" fill="none" stroke="#2fd06e" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(passed / data.checks.length) * around} ${around}`} />}
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#10163a]">{passed}/{data.checks.length}</span>
              </div>
              <p className="mt-2 text-center text-sm font-bold text-[#10163a]">AI readiness</p>
              <ul className="mt-3 flex flex-col gap-3">
                {data.checks.map((c) => (
                  <li key={c.id} className="text-sm text-[#10163a]">
                    <div className="flex items-start gap-2">
                      {c.ok ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Passed" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-label="Needs work" />}
                      <span className="min-w-0 flex-1">{c.label}</span>
                      {!c.ok && c.action && <Link href={c.action.href} className="shrink-0 rounded-full px-3 py-1 text-xs font-bold shadow-sm shadow-indigo-900/15">{c.action.label}</Link>}
                    </div>
                    {!c.ok && c.details.length > 0 && <ul className="ml-6 mt-1 flex flex-col gap-0.5 text-xs text-[#6b7399]">{c.details.map((d) => <li key={d}>{d}</li>)}</ul>}
                  </li>
                ))}
              </ul>
            </section>
            <section className={`${CARD} p-5`}>
              <h2 className="text-sm font-bold text-[#10163a]">Auto-sync</h2>
              <p className="text-xs text-[#6b7399]">Edit once, updates everywhere</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {data.sections.filter((s) => s.auto && isAutoSource(s.auto)).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm text-[#10163a]">
                    <RefreshCw size={14} className="shrink-0 text-[#6b7399]" />
                    <Link href={AUTO_SOURCES[s.auto as keyof typeof AUTO_SOURCES].href} className="min-w-0 flex-1 hover:text-[#2a50c8]">{AUTO_SOURCES[s.auto as keyof typeof AUTO_SOURCES].label}</Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.visible ? "on" : "off"}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
