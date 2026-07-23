"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImportResult } from "@/lib/excel";

export function ImportModal({
  title,
  templateHref,
  onImport,
  trigger,
}: {
  title: string;
  templateHref: string;
  onImport: (formData: FormData) => Promise<ImportResult>;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setFile(null);
    setResult(null);
    setError(null);
  }

  function submit() {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const res = await onImport(formData);
      if (res.ok) {
        setResult(res);
        router.refresh();
      } else {
        setError(res.errors[0]?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{title}</h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {!result && (
              <>
                <p className="mt-3 text-sm text-slate-500">
                  Upload an .xlsx file to bulk-create records.{" "}
                  <a href={templateHref} className="text-blue-600 hover:text-blue-700 font-medium">
                    Download template
                  </a>
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-3 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 file:text-sm file:font-medium"
                />

                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !file}
                    onClick={submit}
                    className="flex-1 rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5"
                  >
                    {isPending ? "Importing..." : "Import"}
                  </button>
                </div>
              </>
            )}

            {result && (
              <div className="mt-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-green-600">{result.created}</span> record
                  {result.created === 1 ? "" : "s"} created.
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-600 mb-1">
                      {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped:
                    </p>
                    <ul className="text-xs text-red-500 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 w-full rounded-xl bg-blue-700 text-white text-sm font-medium py-2.5"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
