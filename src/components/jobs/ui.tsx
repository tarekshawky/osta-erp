import Link from "next/link";
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_STYLE, JOB_STATUS_LABEL, JOB_STATUS_STYLE, JOB_TYPE_LABEL, type ApplicationStatusKey, type JobStatusKey, type JobTypeKey } from "@/lib/jobs/constants";

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${JOB_STATUS_STYLE[status as JobStatusKey] ?? "bg-slate-100 text-slate-600"}`}>{JOB_STATUS_LABEL[status as JobStatusKey] ?? status}</span>;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${APPLICATION_STATUS_STYLE[status as ApplicationStatusKey] ?? "bg-slate-100 text-slate-600"}`}>{APPLICATION_STATUS_LABEL[status as ApplicationStatusKey] ?? status}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  const t = JOB_TYPE_LABEL[type as JobTypeKey];
  return <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{t ? `${t.en} · ${t.ar}` : type}</span>;
}

export function StatCard({ label, value, href, tone = "slate" }: { label: string; value: number | string; href?: string; tone?: "slate" | "blue" | "emerald" | "amber" | "violet" }) {
  const tones = { slate: "text-slate-900", blue: "text-blue-700", emerald: "text-emerald-700", amber: "text-amber-600", violet: "text-violet-700" };
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export const jobTitle = (j: { titleEn?: string | null; titleAr?: string | null; category?: { nameEn: string } | null; number?: number }) =>
  j.titleEn || j.titleAr || (j.category ? `${j.category.nameEn}${j.number ? ` #${j.number}` : ""}` : `Job #${j.number ?? ""}`);

export const stamp = (d: Date | string) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export const day = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric" });

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50">← Previous</Link> : <span className="px-3 py-1.5 text-slate-300">← Previous</span>}
      <span className="text-slate-500">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Next →</Link> : <span className="px-3 py-1.5 text-slate-300">Next →</span>}
    </nav>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
