"use client";

import { useState } from "react";
import { CropStage } from "@/components/cms/CropStage";
import { cropOutput, fitRatio, sharpestSource, type Rect } from "@/lib/cms/imageEdit";
import { uploadImage, mediaPublicUrl } from "@/components/media/mediaClient";

const RATIOS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "Square", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];
// How wide the new picture will be, in pixels. "Original" keeps every pixel of the part you chose; the others shrink it (never enlarge it).
const SIZES: { label: string; value: number }[] = [
  { label: "Original size", value: 0 },
  { label: "Large (1600 px)", value: 1600 },
  { label: "Medium (1000 px)", value: 1000 },
  { label: "Small (600 px)", value: 600 },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The picture could not be opened for editing. If it is hosted on another website, upload it to the media library first."));
    img.src = src;
  });
}

// Crop and resize any picture with the mouse. The result is saved as a NEW picture in the media library (the original is never changed) and
// handed back as its address, so it works for the image field of any block, blog post or page.
export function ImageCropDialog({ src, onClose, onDone }: { src: string; onClose: () => void; onDone: (url: string) => void }) {
  const source = sharpestSource(src);
  const [avail] = useState(() => Math.max(240, Math.min(620, window.innerWidth - 80)));
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [lock, setLock] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseRatio = (r: number | null) => {
    setLock(r);
    if (r && nat) setRect(fitRatio(rect, r, nat));
  };
  const out = nat ? cropOutput(nat, rect, maxWidth) : null;

  async function apply() {
    setError(null);
    setBusy(true);
    try {
      const img = await loadImage(source);
      const o = cropOutput({ w: img.naturalWidth, h: img.naturalHeight }, rect, maxWidth);
      const canvas = document.createElement("canvas");
      canvas.width = o.outW;
      canvas.height = o.outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser cannot edit pictures.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, o.sx, o.sy, o.sw, o.sh, 0, 0, o.outW, o.outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
      if (!blob) throw new Error("The cropped picture could not be created.");
      const asset = await uploadImage(new File([blob], "cropped.webp", { type: blob.type || "image/webp" }));
      onDone(mediaPublicUrl(asset.id));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the cropped picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop and resize the picture" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Crop and resize the picture</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 overflow-auto bg-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[11px] text-slate-500">Keep the shape:</span>
            {RATIOS.map((r) => (
              <button key={r.label} type="button" onClick={() => chooseRatio(r.value)} aria-pressed={lock === r.value} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${lock === r.value ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <CropStage src={source} rect={rect} onRect={setRect} lock={lock} nat={nat} onNat={setNat} avail={avail} />
          <p className="text-[11px] text-slate-500">Drag the frame to move it, and its corners or edges to resize. The bright part becomes the new picture.</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[11px] text-slate-500">Size of the new picture:</span>
            {SIZES.map((s) => (
              <button key={s.value} type="button" onClick={() => setMaxWidth(s.value)} aria-pressed={maxWidth === s.value} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${maxWidth === s.value ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
                {s.label}
              </button>
            ))}
          </div>
          {out && <p className="text-[11px] text-slate-500" data-testid="crop-result-size">New picture: {out.outW} × {out.outH} pixels</p>}
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={() => { setRect({ x: 0, y: 0, w: 1, h: 1 }); setLock(null); setMaxWidth(0); }} className="text-xs font-medium text-slate-500 hover:text-red-600">
            Reset
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Saved as a new picture; the original stays in the library.</span>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={() => void apply()} disabled={!nat || busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
