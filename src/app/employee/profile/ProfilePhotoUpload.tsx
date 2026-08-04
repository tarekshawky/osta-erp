"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { compressImageFile } from "@/lib/imageCompress";
import { updateMyPhoto, removeMyPhoto } from "./actions";

export function ProfilePhotoUpload({
  name,
  initials,
  photoData,
}: {
  name: string;
  initials: string;
  photoData: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(photoData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      setPreview(dataUrl);
      startTransition(async () => {
        const res = await updateMyPhoto(dataUrl);
        if (res.ok) {
          router.refresh();
          showToast("Photo updated.");
        } else {
          setError(res.error ?? "Something went wrong.");
        }
      });
    } catch {
      setError("Could not process the selected image.");
    }
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeMyPhoto();
      if (res.ok) {
        setPreview(null);
        router.refresh();
        showToast("Photo removed.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        className="relative h-20 w-20 rounded-full disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-blue-950 text-white flex items-center justify-center text-2xl font-semibold">
            {initials}
          </div>
        )}
        <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-blue-700 text-white flex items-center justify-center border-2 border-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

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

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex gap-3 text-xs">
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="font-medium text-blue-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : preview ? "Change Photo" : "Upload Photo"}
        </button>
        {preview && (
          <button type="button" disabled={isPending} onClick={handleRemove} className="font-medium text-red-600 disabled:opacity-60">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
