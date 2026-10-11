"use client";

import { useRef, useState } from "react";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { uploadImage, mediaPublicUrl } from "@/components/media/mediaClient";

// Every image field in the admin goes through the media library: pick an existing image or upload a new one
// (which lands in the library, converted to WebP). Older values (pasted URLs, inline data) still display and can be replaced.
export function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const asset = await uploadImage(file);
      onChange(mediaPublicUrl(asset.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>

      {value && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full object-cover" />
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
          {value ? "Change from library" : "Choose from library"}
        </button>
        <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-60">
          {busy ? "Uploading…" : "Upload new"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-red-600">
            Remove
          </button>
        )}
      </div>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Choose an image">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Choose an image</h3>
              <button type="button" onClick={() => setPicking(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <MediaLibrary onPick={(url) => { onChange(url); setPicking(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
