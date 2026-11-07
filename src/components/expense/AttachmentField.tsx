"use client";

import { useRef, useState } from "react";
import { compressImageFile } from "@/lib/imageCompress";

// Attach a photo or PDF (supplier invoice, proof of payment). Images are compressed; the file is kept with the record.
export function AttachmentField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = file.type.startsWith("image/")
        ? await compressImageFile(file)
        : await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onerror = () => rej(new Error("read"));
            r.onload = () => res(String(r.result));
            r.readAsDataURL(file);
          });
      onChange(url);
    } catch {
      setErr("Could not read the file.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {busy ? "Processing…" : value ? "Replace file" : "Attach file"}
        </button>
        {value && (
          <>
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View</a>
            <button type="button" onClick={() => onChange(null)} className="text-sm text-red-600 hover:underline">Remove</button>
          </>
        )}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
