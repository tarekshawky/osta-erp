"use client";

import { useState } from "react";
import { CropStage } from "@/components/cms/CropStage";
import { alignFromOffset, cropFromRect, dragBox, fitRatio, rectFromCrop, sizeFromBox, type BoxHandle, type Rect } from "@/lib/cms/imageEdit";

type Obj = Record<string, unknown>;
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// How wide a block's content can get on the website, and how wide the preview that stands for it is.
const PAGE_W = 1100;
const STAGE_MAX_W = 620;

// Preset shapes the crop can be locked to (width over height).
const RATIOS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "Square", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

// The shape a picture shape forces on the box (the same ratios the website uses), or null when no shape is set.
function shapeRatio(frame: Obj): number | null {
  switch (frame.shape) {
    case "square": case "circle": return 1;
    case "rectangle": case "rounded": return 4 / 3;
    case "landscape": return 16 / 9;
    case "portrait": return 3 / 4;
    case "custom": return Math.max(1, num(frame.ratioW, 16)) / Math.max(1, num(frame.ratioH, 9));
    default: return null;
  }
}

const handleClass = "absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-blue-600 bg-white shadow";

// Shows the visible part of the picture exactly the way the website cuts it: scaled up and shifted inside a box of the cropped shape.
function CroppedView({ src, rect, width, ratio }: { src: string; rect: Rect; width: number; ratio: number }) {
  return (
    <div className="relative overflow-hidden" style={{ width, height: width / ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: `${100 / rect.w}%`, height: `${100 / rect.h}%`, left: `${(-rect.x / rect.w) * 100}%`, top: `${(-rect.y / rect.h) * 100}%` }} />
    </div>
  );
}

type Tab = "crop" | "size";

// A window to crop, resize and align the advanced image with the mouse: drag the corners and edges, nothing to type. It writes the
// block's own crop, size and position settings (the original picture file is never changed).
function Editor({ imageUrl, props, onApply, onClose }: { imageUrl: string; props: Obj; onApply: (next: Obj) => void; onClose: () => void }) {
  // The window can be narrower than the usual preview (a phone, a small pane): everything scales down to fit, so no handle is cut off.
  const [avail] = useState(() => Math.max(240, Math.min(STAGE_MAX_W, window.innerWidth - 80)));
  const pw = Math.min(560, avail);
  const size = (props.size ?? {}) as Obj, position = (props.position ?? {}) as Obj, frame = (props.frame ?? {}) as Obj;
  const forced = shapeRatio(frame); // a picture shape decides the box, so crop is off while one is set
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [tab, setTab] = useState<Tab>(forced ? "size" : "crop");
  const [rect, setRect] = useState<Rect>(() => rectFromCrop({ cropTop: num(size.cropTop), cropRight: num(size.cropRight), cropBottom: num(size.cropBottom), cropLeft: num(size.cropLeft) }));
  const [lock, setLock] = useState<number | null>(null);
  const [cropTouched, setCropTouched] = useState(false);

  // Where the picture's box starts: its current width, and its place from the alignment.
  const startW = size.mode === "custom" && num(size.width) > 0 ? (size.widthUnit === "px" ? Math.min(pw, (num(size.width) * pw) / PAGE_W) : (num(size.width) / 100) * pw) : pw;
  const [boxW, setBoxW] = useState(startW);
  const [boxH, setBoxH] = useState<number | null>(size.mode === "custom" && num(size.height) > 0 && size.heightUnit !== "%" ? (num(size.height) * pw) / PAGE_W : null);
  const [keepShape, setKeepShape] = useState(!(size.mode === "custom" && num(size.height) > 0) || forced !== null);
  const [offsetX, setOffsetX] = useState(() => (position.align === "start" ? 0 : position.align === "end" ? pw - startW : (pw - startW) / 2));
  const [sizeTouched, setSizeTouched] = useState(false);

  const natural = nat ?? { w: 3, h: 2 };
  const cropRatio = (natural.w * rect.w) / (natural.h * rect.h); // shape of the visible part
  const ratio = forced ?? cropRatio;
  const effectiveH = keepShape ? boxW / ratio : boxH ?? boxW / ratio;

  // The drag in progress (what was grabbed, and the state when it was grabbed), or null.
  const [drag, setDrag] = useState<{ kind: "box" | "move"; handle: BoxHandle | "move"; x: number; y: number; w: number; h: number; off: number } | null>(null);
  const begin = (kind: "box" | "move", handle: BoxHandle | "move") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ kind, handle, x: e.clientX, y: e.clientY, w: boxW, h: effectiveH, off: offsetX });
  };
  const move = (e: React.PointerEvent) => {
    const d = drag;
    if (!d) return;
    const dxp = e.clientX - d.x, dyp = e.clientY - d.y;
    if (d.kind === "box") {
      const next = dragBox({ w: d.w, h: d.h }, d.handle as BoxHandle, dxp, dyp, { maxW: pw }, keepShape ? ratio : undefined);
      setBoxW(next.w);
      setBoxH(next.h);
      setOffsetX((o) => Math.min(o, pw - next.w));
      setSizeTouched(true);
    } else {
      setOffsetX(Math.min(pw - d.w, Math.max(0, d.off + dxp)));
      setSizeTouched(true);
    }
  };
  const end = () => {
    const d = drag;
    setDrag(null);
    // Letting go of the box snaps it to the left, middle or right.
    if (d && d.kind === "move") {
      const a = alignFromOffset(offsetX, boxW, pw);
      setOffsetX(a === "start" ? 0 : a === "end" ? pw - boxW : (pw - boxW) / 2);
    }
  };

  const chooseRatio = (r: number | null) => {
    setLock(r);
    if (r && nat) {
      setRect(fitRatio(rect, r, nat));
      setCropTouched(true);
    }
  };

  const apply = () => {
    const next: Obj = { ...props };
    const nextSize: Obj = { ...size };
    if (cropTouched) Object.assign(nextSize, cropFromRect(rect));
    if (sizeTouched) {
      Object.assign(nextSize, sizeFromBox({ w: boxW, h: effectiveH }, pw, PAGE_W, keepShape || forced !== null));
      next.position = { ...position, align: alignFromOffset(offsetX, boxW, pw), wrap: "none" };
    }
    next.size = nextSize;
    onApply(next);
    onClose();
  };
  const reset = () => {
    setRect({ x: 0, y: 0, w: 1, h: 1 });
    setLock(null);
    setCropTouched(true);
    setBoxW(pw);
    setBoxH(null);
    setKeepShape(true);
    setOffsetX(0);
    setSizeTouched(true);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Resize and crop the picture" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3" onPointerMove={move} onPointerUp={end}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Resize and crop the picture</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="flex gap-2 border-b border-slate-100 px-5 py-2" role="tablist">
          {(["crop", "size"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} disabled={t === "crop" && forced !== null} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${tab === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {t === "crop" ? "1. Crop" : "2. Size and place"}
            </button>
          ))}
          {forced !== null && <span className="self-center text-[11px] text-amber-600">A picture shape is set, so crop is off. Choose “As set under Size” in the shape list to crop.</span>}
        </div>

        <div className="overflow-auto bg-slate-100 p-4">
          {tab === "crop" && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-slate-500">Keep the shape:</span>
                {RATIOS.map((r) => (
                  <button key={r.label} type="button" onClick={() => chooseRatio(r.value)} aria-pressed={lock === r.value} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${lock === r.value ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              <CropStage src={imageUrl} rect={rect} onRect={(r) => { setRect(r); setCropTouched(true); }} lock={lock} nat={nat} onNat={setNat} avail={avail} />
              <p className="text-[11px] text-slate-500">Drag the frame to move it, and its corners or edges to resize. The bright part is what visitors see.</p>
            </div>
          )}

          {tab === "size" && (
            <div className="flex flex-col items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={keepShape || forced !== null} disabled={forced !== null} onChange={(e) => { setKeepShape(e.target.checked); setSizeTouched(true); }} />
                Keep the picture&apos;s shape while resizing (turn off to stretch the frame freely)
              </label>
              <div className="relative rounded-lg border border-dashed border-slate-400 bg-white" style={{ width: pw, height: Math.max(effectiveH, 60) + 24, padding: 12 }} data-testid="size-stage">
                <span className="absolute right-2 top-1 text-[10px] text-slate-400">the page width</span>
                <div data-testid="size-box" onPointerDown={begin("move", "move")} className="absolute top-3 cursor-grab touch-none select-none border-2 border-blue-600" style={{ left: offsetX, width: boxW, height: effectiveH, overflow: "visible" }}>
                  <div className="h-full w-full overflow-hidden">
                    {forced !== null ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-cover" />
                    ) : (
                      <CroppedView src={imageUrl} rect={rect} width={boxW} ratio={cropRatio} />
                    )}
                  </div>
                  {(["e", "s", "se"] as const).map((h) => (
                    <span key={h} data-handle={h} onPointerDown={begin("box", h)} className={handleClass} style={{ ...(h === "e" ? { left: "100%", top: "50%", cursor: "ew-resize" } : h === "s" ? { left: "50%", top: "100%", cursor: "ns-resize" } : { left: "100%", top: "100%", cursor: "nwse-resize" }) }} />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Drag the right edge, the bottom edge or the corner to change the size. Drag the picture left or right and let go to place it on the left, middle or right.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={reset} className="text-xs font-medium text-slate-500 hover:text-red-600">
            Reset to the original
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={apply} disabled={!nat} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageMouseEditor({ label, imageUrl, props, onChange }: { label: string; imageUrl: string; props: Obj; onChange: (next: Obj) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" disabled={!imageUrl} onClick={() => setOpen(true)} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50">
        {label}
      </button>
      <p className="text-[11px] text-slate-400">{imageUrl ? "Crop, resize and move the picture by dragging, with nothing to type. The original file is never changed." : "Choose a picture first."}</p>
      {open && <Editor imageUrl={imageUrl} props={props} onApply={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

