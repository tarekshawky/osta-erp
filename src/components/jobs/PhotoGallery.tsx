"use client";

import { useCallback, useEffect, useState } from "react";

// Work photos of one application: thumbnails, and a lightbox with full size, next/previous (arrow keys) and download.
// Photos are private: every image is served through the authenticated admin route.
export function PhotoGallery({ photoIds }: { photoIds: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photoIds.length) % photoIds.length)), [photoIds.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, move]);

  if (photoIds.length === 0) return <p className="text-sm text-slate-400">No photos.</p>;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photoIds.map((id, i) => (
          <li key={id}>
            <button type="button" onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-label={`Open photo ${i + 1} of ${photoIds.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/jobs/photos/${id}?size=thumb`} alt={`Work photo ${i + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/jobs/photos/${photoIds[open]}`} alt={`Work photo ${open + 1}`} className="max-h-[88vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm">{open + 1} / {photoIds.length}</span>
            <div className="flex gap-4 text-sm">
              <a href={`/api/admin/jobs/photos/${photoIds[open]}?download=1`} className="underline">Download</a>
              <button type="button" onClick={close} className="underline">Close</button>
            </div>
          </div>
          {photoIds.length > 1 && (
            <>
              <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); move(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white hover:bg-white/25">‹</button>
              <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); move(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white hover:bg-white/25">›</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
