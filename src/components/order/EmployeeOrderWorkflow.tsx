"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { compressImageFile } from "@/lib/imageCompress";
import { MAX_ORDER_PHOTOS_PER_KIND } from "@/lib/orderData";
import {
  acceptOrder,
  sendAcceptedWhatsApp,
  sendOnTheWayWhatsApp,
  markArrived,
  sendArrivedWhatsApp,
  startWork,
  saveJobDetails,
  completeJob,
  type OrderWorkflowResult,
} from "@/app/employee/orders/actions";

type OrderPhoto = { id: string; kind: string; dataUrl: string };

type WorkflowOrder = {
  id: string;
  status: string;
  acceptedWhatsAppSentAt: Date | null;
  onTheWayWhatsAppSentAt: Date | null;
  arrivedWhatsAppSentAt: Date | null;
  etaMinutes: string | null;
  jobNotes: string | null;
  photos: OrderPhoto[];
};

const WhatsAppIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1120.2 12 8.2 8.2 0 0112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.5.1-.5.8-.6.9-.2.2-.4.1a6.7 6.7 0 01-2-1.2 7.4 7.4 0 01-1.4-1.7c-.1-.2 0-.3.1-.5l.4-.4a1.6 1.6 0 00.2-.4.5.5 0 000-.4c-.1-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.8 2 4.7 4.7 0 001 2.5 10.6 10.6 0 004.1 3.6c.6.2 1 .4 1.4.5a3.3 3.3 0 001.5.1 2.4 2.4 0 001.6-1.1 2 2 0 00.1-1.1c-.1-.1-.2-.1-.4-.2z" />
  </svg>
);

function PhotoGrid({
  label,
  photos,
  onAdd,
  onRemove,
}: {
  label: string;
  photos: string[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</span>
      <div className="flex flex-wrap gap-2">
        {photos.map((dataUrl, index) => (
          <div key={index} className="relative h-16 w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`${label} ${index + 1}`} className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs leading-none"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_ORDER_PHOTOS_PER_KIND && (
          <label className="h-16 w-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAdd(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function EmployeeOrderWorkflow({ order }: { order: WorkflowOrder }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [eta, setEta] = useState(order.etaMinutes ?? "");
  const [showEtaInput, setShowEtaInput] = useState(false);
  const [jobNotes, setJobNotes] = useState(order.jobNotes ?? "");
  const [beforePhotos, setBeforePhotos] = useState<string[]>(
    order.photos.filter((p) => p.kind === "Before").map((p) => p.dataUrl)
  );
  const [afterPhotos, setAfterPhotos] = useState<string[]>(
    order.photos.filter((p) => p.kind === "After").map((p) => p.dataUrl)
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);

  function run(action: () => Promise<OrderWorkflowResult>) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (res.whatsappUrl) window.open(res.whatsappUrl, "_blank", "noopener,noreferrer");
        showToast("Updated.");
        router.refresh();
      } else {
        showToast(res.error ?? "Something went wrong.");
      }
    });
  }

  async function handlePhotosSelected(kind: "before" | "after", files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const current = kind === "before" ? beforePhotos : afterPhotos;
    const remaining = MAX_ORDER_PHOTOS_PER_KIND - current.length;
    if (remaining <= 0) {
      setPhotoError(`Up to ${MAX_ORDER_PHOTOS_PER_KIND} photos allowed.`);
      return;
    }
    const filesToAdd = Array.from(files).slice(0, remaining);
    try {
      const compressed = await Promise.all(filesToAdd.map((f) => compressImageFile(f)));
      if (kind === "before") setBeforePhotos((prev) => [...prev, ...compressed]);
      else setAfterPhotos((prev) => [...prev, ...compressed]);
    } catch {
      setPhotoError("Could not process one of the selected photos.");
    }
  }

  function removePhoto(kind: "before" | "after", index: number) {
    if (kind === "before") setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
    else setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMarkArrived() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      run(() => markArrived(order.id, null, null));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => run(() => markArrived(order.id, pos.coords.latitude, pos.coords.longitude)),
      () => {
        setGpsWarning("Location wasn't available — arrival saved without GPS.");
        run(() => markArrived(order.id, null, null));
      },
      { timeout: 8000 }
    );
  }

  if (order.status === "Assigned") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => acceptOrder(order.id))}
        className="w-full rounded-xl bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
      >
        {isPending ? "Accepting..." : "Accept Order"}
      </button>
    );
  }

  if (order.status === "Accepted") {
    if (!order.acceptedWhatsAppSentAt) {
      return (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => sendAcceptedWhatsApp(order.id))}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 disabled:opacity-60 text-white font-medium text-sm py-3.5"
        >
          {WhatsAppIcon}
          {isPending ? "Sending..." : "Send WhatsApp"}
        </button>
      );
    }
    if (!showEtaInput) {
      return (
        <button
          type="button"
          onClick={() => setShowEtaInput(true)}
          className="w-full rounded-xl bg-blue-700 text-white font-medium text-sm py-3.5"
        >
          Start Driving
        </button>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <Field label="Estimated Arrival (Minutes)">
          <input
            type="number"
            min="1"
            className={inputClassName}
            placeholder="e.g. 15"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
        </Field>
        <button
          type="button"
          disabled={isPending || !eta.trim()}
          onClick={() => run(() => sendOnTheWayWhatsApp(order.id, eta))}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 disabled:bg-green-300 text-white font-medium text-sm py-3.5"
        >
          {WhatsAppIcon}
          {isPending ? "Sending..." : "Send WhatsApp"}
        </button>
      </div>
    );
  }

  if (order.status === "On The Way") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={handleMarkArrived}
        className="w-full rounded-xl bg-purple-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
      >
        {isPending ? "Saving..." : "Arrived"}
      </button>
    );
  }

  if (order.status === "Arrived") {
    if (!order.arrivedWhatsAppSentAt) {
      return (
        <div className="flex flex-col gap-2">
          {gpsWarning && <p className="text-xs text-amber-600">{gpsWarning}</p>}
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => sendArrivedWhatsApp(order.id))}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 disabled:opacity-60 text-white font-medium text-sm py-3.5"
          >
            {WhatsAppIcon}
            {isPending ? "Sending..." : "Send WhatsApp"}
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => startWork(order.id))}
        className="w-full rounded-xl bg-orange-600 disabled:opacity-60 text-white font-medium text-sm py-3.5"
      >
        {isPending ? "Starting..." : "Start Work"}
      </button>
    );
  }

  if (order.status === "In Progress") {
    return (
      <div className="flex flex-col gap-4">
        {photoError && <p className="text-sm text-red-500">{photoError}</p>}
        <Field label="Job Notes">
          <textarea
            rows={3}
            className={inputClassName}
            placeholder="Notes about the job"
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
          />
        </Field>
        <PhotoGrid
          label="Before Photos"
          photos={beforePhotos}
          onAdd={(files) => handlePhotosSelected("before", files)}
          onRemove={(index) => removePhoto("before", index)}
        />
        <PhotoGrid
          label="After Photos"
          photos={afterPhotos}
          onAdd={(files) => handlePhotosSelected("after", files)}
          onRemove={(index) => removePhoto("after", index)}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => saveJobDetails(order.id, jobNotes, beforePhotos, afterPhotos))}
          className="w-full rounded-xl border border-slate-200 text-slate-700 font-medium text-sm py-3 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Job Details"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => completeJob(order.id))}
          className="w-full rounded-xl bg-green-700 disabled:opacity-60 text-white font-medium text-sm py-3.5"
        >
          {isPending ? "Completing..." : "Complete Job"}
        </button>
      </div>
    );
  }

  return null;
}
