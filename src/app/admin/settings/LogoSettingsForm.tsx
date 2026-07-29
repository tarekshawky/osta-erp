"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { compressImageFile } from "@/lib/imageCompress";
import { DEFAULT_LOGO_SRC } from "@/lib/logo";
import { updateLogo, resetLogo } from "@/app/actions/settings";

export function LogoSettingsForm({ currentSrc }: { currentSrc: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentSrc);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      setPreview(dataUrl);
      startTransition(async () => {
        const res = await updateLogo(dataUrl);
        if (res.ok) {
          router.refresh();
          showToast("Logo updated.");
        } else {
          setError(res.error ?? "Something went wrong.");
        }
      });
    } catch {
      setError("Could not process the selected image.");
    }
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const res = await resetLogo();
      if (res.ok) {
        setPreview(DEFAULT_LOGO_SRC);
        router.refresh();
        showToast("Logo reset to default.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Current logo" className="h-20 w-auto" />
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5"
        >
          {isPending ? "Saving..." : "Upload New Logo"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleReset}
          className="rounded-xl border border-slate-200 disabled:opacity-60 text-slate-700 text-sm font-medium px-4 py-2.5"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
