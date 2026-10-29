"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { duplicateJobAction, setJobStatus } from "@/app/admin/jobs/actions";
import { JOB_STATUS_LABEL, STATUS_TRANSITIONS, type JobStatusKey } from "@/lib/jobs/constants";
import { ShareDialog } from "@/components/jobs/ShareDialog";

type Props = {
  job: { id: string; status: string; slug: string | null };
  publicUrl: string | null;
  texts?: { ar: string; en: string };
  compact?: boolean;
};

// What each button does, with the confirmation text. Every status change asks first and is logged in the job's history.
const ACTIONS: { to: JobStatusKey; from: JobStatusKey[]; label: string; confirm: string; tone?: "danger" | "primary" }[] = [
  { to: "PUBLISHED", from: ["DRAFT"], label: "Publish", confirm: "Publish this job? It becomes visible on the public jobs page and starts accepting applications.", tone: "primary" },
  { to: "DRAFT", from: ["PUBLISHED", "CANCELLED"], label: "Unpublish", confirm: "Move this job back to Draft? The public page will no longer be available until you publish it again." },
  { to: "PUBLISHED", from: ["APPLICATIONS_CLOSED"], label: "Reopen applications", confirm: "Reopen applications? The job appears on the jobs page again (if its deadline has not passed)." },
  { to: "APPLICATIONS_CLOSED", from: ["PUBLISHED", "IN_PROGRESS"], label: "Close applications", confirm: "Close applications? Visitors will see that applications are closed and can no longer apply." },
  { to: "IN_PROGRESS", from: ["PUBLISHED", "APPLICATIONS_CLOSED"], label: "Mark In Progress", confirm: "Mark this job as in progress? It stops accepting applications." },
  { to: "COMPLETED", from: ["PUBLISHED", "APPLICATIONS_CLOSED", "IN_PROGRESS"], label: "Mark Completed", confirm: "This job will stop accepting applications and move to Completed. The public link will stay active and show a ‘job completed’ message.", tone: "primary" },
  { to: "CANCELLED", from: ["DRAFT", "PUBLISHED", "APPLICATIONS_CLOSED", "IN_PROGRESS"], label: "Cancel job", confirm: "Cancel this job? The public link shows that the opportunity was cancelled.", tone: "danger" },
];

export function JobActions({ job, publicUrl, texts, compact }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState<(typeof ACTIONS)[number] | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState<string[] | null>(null);
  const [share, setShare] = useState(false);
  const status = job.status as JobStatusKey;

  // Right after publishing the form sends the admin here with ?share=1.
  useEffect(() => {
    if (params.get("share") === "1" && texts) void Promise.resolve().then(() => setShare(true));
  }, [params, texts]);

  const available = ACTIONS.filter((a) => a.from.includes(status) && STATUS_TRANSITIONS[status].includes(a.to));

  const run = (a: (typeof ACTIONS)[number], confirmMissingTranslation = false) =>
    startTransition(async () => {
      const res = await setJobStatus(job.id, a.to, { note, confirmMissingTranslation });
      if (res.needsConfirm) {
        setMissing(res.missing ?? []);
        return;
      }
      if (!res.ok) {
        showToast(res.error ?? "Could not change the status.", "error");
        return;
      }
      showToast(`Job is now ${JOB_STATUS_LABEL[a.to].toLowerCase()}`);
      setAsking(null);
      setMissing(null);
      setNote("");
      router.refresh();
      if (a.to === "PUBLISHED") router.push(`/admin/jobs/${job.id}?share=1`);
    });

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast("Application link copied");
    } catch {
      showToast("Could not copy the link.", "error");
    }
  }

  const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "COMPLETED" && status !== "CANCELLED" && <Link href={`/admin/jobs/${job.id}/edit`} className={btn}>Edit</Link>}
      <Link href={`/jobs/preview/${job.id}`} target="_blank" className={btn}>Preview</Link>
      <button type="button" disabled={pending} className={btn} onClick={() => startTransition(async () => { const r = await duplicateJobAction(job.id); if (r.ok && r.id) { showToast("Job duplicated as a draft"); router.push(`/admin/jobs/${r.id}/edit`); } else showToast(r.error ?? "Could not duplicate.", "error"); })}>Duplicate</button>
      {job.slug && <button type="button" className={btn} onClick={() => void copyLink()}>Copy application link</button>}
      {job.slug && texts && !compact && <button type="button" className={`${btn} border-green-200 text-green-700`} onClick={() => setShare(true)}>Share</button>}
      {job.slug && !texts && <Link href={`/admin/jobs/${job.id}?share=1`} className={`${btn} border-green-200 text-green-700`}>Share</Link>}
      <Link href={`/admin/jobs/applications?jobId=${job.id}`} className={btn}>View applications</Link>
      {available.map((a) => (
        <button key={a.label} type="button" disabled={pending} onClick={() => { setAsking(a); setNote(""); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${a.tone === "primary" ? "bg-blue-600 text-white hover:bg-blue-700" : a.tone === "danger" ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{a.label}</button>
      ))}

      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="st-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 id="st-title" className="text-base font-bold text-slate-900">{asking.label}?</h3>
            <p className="mt-2 text-sm text-slate-600">{asking.confirm}</p>
            {missing ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Missing in one language:</p>
                <ul className="list-disc pl-5">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            ) : (
              <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-slate-500">
                Note (optional, kept in the job history)
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => { setAsking(null); setMissing(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Keep as is</button>
              <button type="button" disabled={pending} onClick={() => run(asking, !!missing)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{missing ? "Publish anyway" : "Yes, continue"}</button>
            </div>
          </div>
        </div>
      )}

      {share && texts && publicUrl && <ShareDialog texts={texts} url={publicUrl} onClose={() => { setShare(false); if (params.get("share")) router.replace(`/admin/jobs/${job.id}`); }} />}
    </div>
  );
}
