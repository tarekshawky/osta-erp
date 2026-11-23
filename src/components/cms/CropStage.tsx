"use client";

import { useState } from "react";
import { dragCrop, type Handle, type Rect } from "@/lib/cms/imageEdit";

const HANDLES: { h: Handle; style: React.CSSProperties; cursor: string }[] = [
  { h: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" }, { h: "n", style: { left: "50%", top: 0 }, cursor: "ns-resize" },
  { h: "ne", style: { left: "100%", top: 0 }, cursor: "nesw-resize" }, { h: "e", style: { left: "100%", top: "50%" }, cursor: "ew-resize" },
  { h: "se", style: { left: "100%", top: "100%" }, cursor: "nwse-resize" }, { h: "s", style: { left: "50%", top: "100%" }, cursor: "ns-resize" },
  { h: "sw", style: { left: 0, top: "100%" }, cursor: "nesw-resize" }, { h: "w", style: { left: 0, top: "50%" }, cursor: "ew-resize" },
];
const handleClass = "absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-blue-600 bg-white shadow";
const GRID = "linear-gradient(to right, transparent 33%, rgba(255,255,255,.45) 33%, rgba(255,255,255,.45) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.45) 66%, rgba(255,255,255,.45) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,.45) 33%, rgba(255,255,255,.45) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.45) 66%, rgba(255,255,255,.45) calc(66% + 1px), transparent calc(66% + 1px))";

// The picture with a bright crop frame over it: drag the frame to move it and its corners or edges to resize. The part outside is dimmed.
// `rect` is the visible part as fractions of the picture; `lock` (width over height of the visible part, in picture pixels) keeps its shape.
export function CropStage({ src, rect, onRect, lock, nat, onNat, avail, maxH = 380 }: {
  src: string; rect: Rect; onRect: (r: Rect) => void; lock: number | null; nat: { w: number; h: number } | null; onNat: (n: { w: number; h: number }) => void; avail: number; maxH?: number;
}) {
  const stage = nat ? Math.min(avail / nat.w, maxH / nat.h) : 1;
  const dw = nat ? nat.w * stage : avail, dh = nat ? nat.h * stage : Math.min(maxH, (avail * 2) / 3);
  // The drag in progress: what was grabbed, and where the frame was when it was grabbed.
  const [drag, setDrag] = useState<{ handle: Handle; x: number; y: number; rect: Rect } | null>(null);

  const begin = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ handle, x: e.clientX, y: e.clientY, rect });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    onRect(dragCrop(drag.rect, drag.handle, (e.clientX - drag.x) / dw, (e.clientY - drag.y) / dh, lock && nat ? { ratio: lock, nat } : undefined));
  };

  const px = { left: rect.x * dw, top: rect.y * dh, width: rect.w * dw, height: rect.h * dh };
  return (
    <div className="relative touch-none select-none" style={{ width: dw, height: dh }} data-testid="crop-stage" onPointerMove={move} onPointerUp={() => setDrag(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} onLoad={(e) => onNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="absolute inset-0 h-full w-full select-none" />
      <div className="pointer-events-none absolute left-0 top-0 w-full bg-slate-900/55" style={{ height: px.top }} />
      <div className="pointer-events-none absolute left-0 w-full bg-slate-900/55" style={{ top: px.top + px.height, height: dh - px.top - px.height }} />
      <div className="pointer-events-none absolute bg-slate-900/55" style={{ left: 0, top: px.top, width: px.left, height: px.height }} />
      <div className="pointer-events-none absolute bg-slate-900/55" style={{ left: px.left + px.width, top: px.top, width: dw - px.left - px.width, height: px.height }} />
      <div data-testid="crop-rect" onPointerDown={begin("move")} className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(37,99,235,.9)]" style={px}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: GRID }} />
        {HANDLES.map(({ h, style, cursor }) => (
          <span key={h} data-handle={h} onPointerDown={begin(h)} className={handleClass} style={{ ...style, cursor }} />
        ))}
      </div>
    </div>
  );
}
