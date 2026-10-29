"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { inputClassName } from "@/components/FormField";
import { convertToEmployee, deleteApplicantData } from "@/app/admin/jobs/actions";

// "Convert to Employee" (needs an employee code and a 4-digit PIN) and "Delete applicant data" (privacy request).
export function WorkerActions({ applicantId, name, employeeId, defaultTitle }: { applicantId: string; name: string; employeeId: string | null; defaultTitle: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [convert, setConvert] = useState(false);
  const [del, setDel] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState(defaultTitle);
  const [pin, setPin] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      {employeeId ? <Link href="/admin/employees" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Already an employee</Link> : <button type="button" onClick={() => setConvert(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Convert to Employee</button>}
      <button type="button" onClick={() => setDel(true)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Delete applicant data</button>

      {convert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="conv-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 id="conv-title" className="text-base font-bold text-slate-900">Convert {name} to an employee?</h3>
            <p className="mt-1 text-xs text-slate-500">Creates an employee record with their name and phone. You can complete the rest in Employees.</p>
            <div className="mt-3 flex flex-col gap-2">
              <input className={inputClassName} placeholder="Employee code" value={code} onChange={(e) => setCode(e.target.value)} />
              <input className={inputClassName} placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className={inputClassName} placeholder="4-digit PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConvert(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await convertToEmployee(applicantId, { code, jobTitle: title, pin }); if (r.ok) { showToast("Employee created"); setConvert(false); router.refresh(); } else showToast(r.error ?? "Could not convert.", "error"); })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Convert</button>
            </div>
          </div>
        </div>
      )}

      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 id="del-title" className="text-base font-bold text-slate-900">Delete {name}&apos;s data?</h3>
            <p className="mt-2 text-sm text-slate-600">Their photos, phone number, notes and personal details are permanently removed. Their applications stay as anonymous records so the job statistics stay correct. This can&apos;t be undone and is recorded in the audit log.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDel(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Keep</button>
              <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await deleteApplicantData(applicantId); if (r.ok) { showToast("Applicant data deleted"); setDel(false); router.push("/admin/jobs/workers"); } else showToast(r.error ?? "Could not delete.", "error"); })} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
