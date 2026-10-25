"use client";

import { useState, useTransition } from "react";
import { createPasswordResetLink, type ResetLinkResult } from "@/app/admin/customers/reset-actions";

// "Customer app account": whether the customer can log in, and a reset link for a customer who forgot the password.
export function CustomerAccountCard({ customerId, email, hasPassword }: { customerId: string; email: string | null; hasPassword: boolean }) {
  const [result, setResult] = useState<ResetLinkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const state = !email ? { label: "No email", style: "bg-slate-100 text-slate-600", note: "The customer app logs in with an email. Add one in Edit Customer." } : hasPassword ? { label: "Has an app account", style: "bg-emerald-50 text-emerald-700", note: "Logs in with their email and password." } : { label: "No password yet", style: "bg-amber-50 text-amber-700", note: "They have not set a password, so they can't log in yet. Send a link so they can choose one." };

  function create(sendEmail: boolean) {
    startTransition(async () => {
      setCopied(false);
      setResult(await createPasswordResetLink(customerId, sendEmail));
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Customer app account</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${state.style}`}>{state.label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{state.note}{email ? <> Login email: <b className="text-slate-700">{email}</b>.</> : null}</p>

      {email && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => create(true)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {pending ? "Creating…" : hasPassword ? "Send password reset" : "Send set-password link"}
          </button>
          <button type="button" disabled={pending} onClick={() => create(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Create link only
          </button>
        </div>
      )}

      {result && !result.ok && <p className="mt-3 text-sm text-red-600">{result.error}</p>}
      {result?.ok && result.url && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
          <p>
            {result.emailed ? "Email sent to the customer. " : result.emailConfigured ? "" : "Email delivery isn't set up on the server, so nothing was emailed. "}
            The link works once and expires in 48 hours. Any earlier link stops working.
          </p>
          <input readOnly dir="ltr" value={result.url} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(result.url!).then(() => setCopied(true))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            {result.whatsappUrl && (
              <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-slate-50">
                Send on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
