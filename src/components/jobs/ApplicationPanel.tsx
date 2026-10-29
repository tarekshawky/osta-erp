"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { addNote, changeApplicationStatus, linkToJob, logContactAction } from "@/app/admin/jobs/actions";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABEL } from "@/lib/jobs/constants";

type Notes = { id: string; body: string; byName: string | null; at: string }[];
type Logs = { id: string; channel: string; outcome: string; note: string | null; byName: string | null; at: string }[];

const OUTCOMES = [["reached", "Reached"], ["no_answer", "No answer"], ["interested", "Interested"], ["not_interested", "Not interested"], ["other", "Other"]] as const;

// Status, internal notes, contact log and "link to another job" for one application.
export function ApplicationPanel({ id, status, notes, logs, openJobs }: { id: string; status: string; notes: Notes; logs: Logs; openJobs: { id: string; label: string }[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState("call");
  const [outcome, setOutcome] = useState("reached");
  const [logNote, setLogNote] = useState("");
  const [jobId, setJobId] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        showToast(ok);
        after?.();
        router.refresh();
      } else showToast(r.error ?? "Something went wrong.", "error");
    });

  const box = "rounded-xl border border-slate-200 bg-white p-4";
  return (
    <div className="flex flex-col gap-4">
      <section className={box}>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Status</h3>
        <select value={status} disabled={pending} onChange={(e) => run(() => changeApplicationStatus([id], e.target.value), "Status updated")} className={inputClassName} aria-label="Application status">
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
        </select>
      </section>

      <section className={box}>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Contact log</h3>
        <div className="grid grid-cols-2 gap-2">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClassName} aria-label="Channel"><option value="call">Call</option><option value="whatsapp">WhatsApp</option></select>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClassName} aria-label="Outcome">{OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <input value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="Note (optional)" maxLength={1000} className={`${inputClassName} mt-2`} />
        <button type="button" disabled={pending} onClick={() => run(() => logContactAction(id, channel, outcome, logNote), "Contact logged", () => setLogNote(""))} className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Log contact</button>
        <ul className="mt-3 flex flex-col divide-y divide-slate-100 text-sm">
          {logs.length === 0 && <li className="py-2 text-slate-400">No contact attempts yet.</li>}
          {logs.map((l) => (
            <li key={l.id} className="py-2">
              <p className="font-medium text-slate-800">{l.channel === "call" ? "📞 Call" : "💬 WhatsApp"} · {OUTCOMES.find(([v]) => v === l.outcome)?.[1] ?? l.outcome}</p>
              {l.note && <p className="text-slate-600">{l.note}</p>}
              <p className="text-xs text-slate-400">{l.at} · {l.byName ?? "—"}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={box}>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Internal notes</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Only admins see these notes." className={inputClassName} />
        <button type="button" disabled={pending || !note.trim()} onClick={() => run(() => addNote(id, note), "Note added", () => setNote(""))} className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Add note</button>
        <ul className="mt-3 flex flex-col divide-y divide-slate-100 text-sm">
          {notes.length === 0 && <li className="py-2 text-slate-400">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="py-2"><p className="whitespace-pre-line text-slate-800">{n.body}</p><p className="text-xs text-slate-400">{n.at} · {n.byName ?? "—"}</p></li>
          ))}
        </ul>
      </section>

      <section className={box}>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Link to another job</h3>
        <p className="mb-2 text-xs text-slate-500">Creates a new application for the same person (same photos, status New). No second applicant record.</p>
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputClassName} aria-label="Job to link">
          <option value="">Choose an open job…</option>
          {openJobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
        </select>
        <button type="button" disabled={pending || !jobId} onClick={() => run(() => linkToJob(id, jobId), "Applicant linked to the job", () => setJobId(""))} className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Link applicant</button>
      </section>
    </div>
  );
}
