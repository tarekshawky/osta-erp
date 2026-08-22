"use client";

import { useEffect, useRef, useState } from "react";

// Real camera-based scanning (per the confirmed decision) via @zxing/browser --
// decodes both QR and common 1D barcode formats from a getUserMedia video
// stream. Requires a secure context (HTTPS in prod, localhost in dev).
export function BarcodeScannerModal({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const videoEl = videoRef.current;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const codeReader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          if (!cancelled) setError("No camera found on this device.");
          return;
        }
        // Prefer a rear/back camera on mobile if labeled as such, else first device.
        const preferred = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];

        const result = await codeReader.decodeOnceFromVideoDevice(preferred.deviceId, videoEl ?? undefined);
        if (!cancelled) onDetected(result.getText());
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not access the camera.");
        }
      }
    })();

    return () => {
      cancelled = true;
      const stream = videoEl?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Scan Barcode / QR</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg bg-slate-900">
            <video ref={videoRef} className="w-full aspect-square object-cover" muted playsInline />
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Point the camera at the item&apos;s barcode or QR code.</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
