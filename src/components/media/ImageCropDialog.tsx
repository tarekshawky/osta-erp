"use client";

import { useEffect, useRef, useState } from "react";
import { CropStage } from "@/components/cms/CropStage";
import { cropOutput, fitRatio, sharpestSource, type Rect } from "@/lib/cms/imageEdit";
import { DEFAULT_LOOK, SHAPES, SHAPE_LABEL, drawStyled, isPlainLook, type DrawCtx, type Look, type Shape } from "@/lib/cms/imageStyle";
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
const ROUNDNESS = [{ label: "Soft", value: 8 }, { label: "Medium", value: 20 }, { label: "Very round", value: 35 }];
const BORDERS = [{ label: "None", value: 0 }, { label: "Thin", value: 1 }, { label: "Medium", value: 2.5 }, { label: "Thick", value: 4 }];
const PREVIEW_W = 260;

const chip = (on: boolean) => `rounded-full px-2.5 py-1 text-[11px] font-medium ${on ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`;
const CHECKER = { backgroundImage: "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0,0 8px,8px -8px,-8px 0" } as const;

// Crop and reshape any picture with the mouse: crop frame, shape (circle, rounded, hexagon...), border, black and white, blur and opacity. The
// result is saved as a NEW picture in the media library (the original is never changed) and handed back as its address, so it works for the
// image field of any block, blog post or page.
export function ImageCropDialog({ src, onClose, onDone }: { src: string; onClose: () => void; onDone: (url: string) => void }) {
  const source = sharpestSource(src);
  const [avail] = useState(() => Math.max(240, Math.min(620, window.innerWidth - 80)));
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [lock, setLock] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState(0);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  // The same picture again, loaded so the browser lets it be drawn on a canvas. A picture hosted on another website cannot be.
  const [drawable, setDrawable] = useState<HTMLImageElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  const out = nat ? cropOutput(nat, rect, maxWidth) : null;
  const change = (p: Partial<Look>) => setLook((l) => ({ ...l, ...p }));
  const chooseRatio = (r: number | null) => {
    setLock(r);
    if (r && nat) setRect(fitRatio(rect, r, nat));
  };
  // A circle needs a square part of the picture, so choosing it squares the frame (drag it back to "Free" afterwards for an oval).
  const chooseShape = (s: Shape) => {
    change({ shape: s });
    if (s === "circle") chooseRatio(1);
  };

  // The result, drawn small, every time anything changes.
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !drawable || !nat) return;
    const o = cropOutput(nat, rect, 0);
    const w = PREVIEW_W, h = Math.max(1, Math.round((PREVIEW_W * o.sh) / o.sw));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) drawStyled(ctx as unknown as DrawCtx, drawable, o, w, h, look);
  }, [drawable, nat, rect, look]);

  async function apply() {
    if (!drawable) return;
    setError(null);
    setBusy(true);
    try {
      const o = cropOutput({ w: drawable.naturalWidth, h: drawable.naturalHeight }, rect, maxWidth);
      const canvas = document.createElement("canvas");
      canvas.width = o.outW;
      canvas.height = o.outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser cannot edit pictures.");
      ctx.imageSmoothingQuality = "high";
      drawStyled(ctx as unknown as DrawCtx, drawable, o, o.outW, o.outH, look);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
      if (!blob) throw new Error("The new picture could not be created.");
      const asset = await uploadImage(new File([blob], "edited.webp", { type: blob.type || "image/webp" }));
      onDone(mediaPublicUrl(asset.id));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the new picture.");
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    setRect({ x: 0, y: 0, w: 1, h: 1 });
    setLock(null);
    setMaxWidth(0);
    setLook(DEFAULT_LOOK);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop and resize the picture" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Crop and resize the picture</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt="" crossOrigin="anonymous" className="hidden" onLoad={(e) => setDrawable(e.currentTarget)} onError={() => setBlocked(true)} />

        <div className="flex flex-col items-center gap-4 overflow-auto bg-slate-100 p-4">
          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">1. Crop</h4>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[11px] text-slate-500">Keep the shape:</span>
              {RATIOS.map((r) => (
                <button key={r.label} type="button" onClick={() => chooseRatio(r.value)} aria-pressed={lock === r.value} className={chip(lock === r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
            <CropStage src={source} rect={rect} onRect={setRect} lock={lock} nat={nat} onNat={setNat} avail={avail} />
            <p className="text-[11px] text-slate-500">Drag the frame to move it, and its corners or edges to resize. The bright part becomes the new picture.</p>
          </section>

          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">2. Shape</h4>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SHAPES.map((s) => (
                <button key={s} type="button" onClick={() => chooseShape(s)} aria-pressed={look.shape === s} className={chip(look.shape === s)}>
                  {SHAPE_LABEL[s]}
                </button>
              ))}
            </div>
            {look.shape === "rounded" && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-slate-500">Corners:</span>
                {ROUNDNESS.map((r) => (
                  <button key={r.value} type="button" onClick={() => change({ roundness: r.value })} aria-pressed={look.roundness === r.value} className={chip(look.roundness === r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            {look.shape !== "none" && <p className="text-[11px] text-slate-500">The corners outside the shape become transparent.</p>}
          </section>

          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">3. Border</h4>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {BORDERS.map((b) => (
                <button key={b.label} type="button" onClick={() => change({ border: b.value })} aria-pressed={look.border === b.value} className={chip(look.border === b.value)}>
                  {b.label}
                </button>
              ))}
              {look.border > 0 && (
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  Colour
                  <input type="color" aria-label="Border colour" value={look.borderColor} onChange={(e) => change({ borderColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
                </label>
              )}
            </div>
          </section>

          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">4. Effects</h4>
            <div className="grid w-full max-w-md gap-2">
              {(
                [
                  ["gray", "Black and white", 0, 100, 5],
                  ["blur", "Blur", 0, 10, 1],
                  ["opacity", "Opacity", 30, 100, 5],
                ] as const
              ).map(([key, label, min, max, step]) => (
                <label key={key} className="grid grid-cols-[110px_1fr_36px] items-center gap-2 text-[11px] text-slate-600">
                  {label}
                  <input type="range" min={min} max={max} step={step} value={look[key]} onChange={(e) => change({ [key]: Number(e.target.value) })} aria-label={label} />
                  <span className="text-right tabular-nums">{look[key]}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">5. Size of the new picture</h4>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {SIZES.map((s) => (
                <button key={s.value} type="button" onClick={() => setMaxWidth(s.value)} aria-pressed={maxWidth === s.value} className={chip(maxWidth === s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
            {out && <p className="text-[11px] text-slate-500" data-testid="crop-result-size">New picture: {out.outW} × {out.outH} pixels</p>}
          </section>

          <section className="flex w-full flex-col items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-700">The result</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2" style={CHECKER}>
              <canvas ref={preview} data-testid="crop-preview" style={{ width: PREVIEW_W, maxWidth: "100%", height: "auto" }} />
            </div>
            {blocked && (
              <p className="max-w-md text-center text-xs text-red-600" role="alert">
                This picture is hosted on another website, so the browser does not let it be edited here. Upload it to the media library first, then crop it.
              </p>
            )}
          </section>
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={reset} className="text-xs font-medium text-slate-500 hover:text-red-600">
            Reset
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 sm:inline">{isPlainLook(look) ? "Saved as a new picture; the original stays in the library." : "Saved as a new picture with this look; the original stays."}</span>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={() => void apply()} disabled={!nat || !drawable || blocked || busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
