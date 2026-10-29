"use client";

import { useTransition } from "react";
import Link from "next/link";
import { markNotificationsRead } from "@/app/admin/jobs/actions";

type N = { id: string; type: string; message: string; readAt: string | null; createdAt: string; jobId: string | null; applicationId: string | null };

const ICON: Record<string, string> = { new_application: "📥", deadline_soon: "⏰", start_soon: "🗓️", expected_end: "🏁" };

export function NotificationsList({ items }: { items: N[] }) {
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <section id="notifications" className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}</h3>
        {unread > 0 && <button type="button" disabled={pending} onClick={() => startTransition(() => markNotificationsRead())} className="text-xs font-medium text-blue-600 disabled:opacity-50">Mark all as read</button>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing yet. New applications and reminders show up here.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {items.map((n) => (
            <li key={n.id} className={`flex items-start gap-2 py-2 text-sm ${n.readAt ? "text-slate-500" : "font-medium text-slate-900"}`}>
              <span aria-hidden>{ICON[n.type] ?? "🔔"}</span>
              <span className="flex-1">{n.message}</span>
              {n.applicationId ? <Link href={`/admin/jobs/applications/${n.applicationId}`} className="shrink-0 text-xs text-blue-600">Open</Link> : n.jobId ? <Link href={`/admin/jobs/${n.jobId}`} className="shrink-0 text-xs text-blue-600">Open</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
