"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { EMIRATES } from "@/lib/invoiceData";
import {
  DEVICE_TYPES,
  TONNAGE_OPTIONS,
  GAS_TYPES,
  CONDITIONS,
  CONDITION_STYLES,
  MAX_PHOTOS_PER_ITEM,
} from "@/lib/workReportData";
import { compressImageFile } from "@/lib/imageCompress";
import { createWorkReport, type WorkReportItemInput, type WorkReportFormInput } from "./actions";
import { updateWorkReport } from "@/app/admin/work-reports/actions";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyItem = (): WorkReportItemInput => ({
  deviceType: DEVICE_TYPES[0],
  tonnage: "",
  gasType: "",
  brand: "",
  condition: "Good",
  description: "",
  photos: [],
});

function updateItem(items: WorkReportItemInput[], index: number, patch: Partial<WorkReportItemInput>) {
  return items.map((it, i) => (i === index ? { ...it, ...patch } : it));
}

export function WorkReportForm({
  mode = "create",
  reportId,
  initial,
  redirectTo,
}: {
  mode?: "create" | "edit";
  reportId?: string;
  initial?: WorkReportFormInput;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [emirate, setEmirate] = useState(initial?.emirate ?? "");
  const [buildingName, setBuildingName] = useState(initial?.buildingName ?? "");
  const [flatNo, setFlatNo] = useState(initial?.flatNo ?? "");
  const [items, setItems] = useState<WorkReportItemInput[]>(initial?.items ?? [emptyItem()]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhotosSelected(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const current = items[index].photos;
    const remainingSlots = MAX_PHOTOS_PER_ITEM - current.length;
    if (remainingSlots <= 0) {
      setPhotoError(`Each device can have up to ${MAX_PHOTOS_PER_ITEM} photos.`);
      return;
    }
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    try {
      const compressed = await Promise.all(filesToAdd.map((f) => compressImageFile(f)));
      setItems((prev) => updateItem(prev, index, { photos: [...prev[index].photos, ...compressed] }));
    } catch {
      setPhotoError("Could not process one of the selected photos.");
    }
  }

  function removePhoto(itemIndex: number, photoIndex: number) {
    setItems((prev) =>
      updateItem(prev, itemIndex, {
        photos: prev[itemIndex].photos.filter((_, i) => i !== photoIndex),
      })
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const payload = { date, customerName, customerPhone, emirate, buildingName, flatNo, items };
      const res =
        mode === "edit" && reportId ? await updateWorkReport(reportId, payload) : await createWorkReport(payload);
      if (res.ok) {
        if (mode === "edit") {
          showToast("Work report updated.");
          router.push(redirectTo ?? "/admin/work-reports");
          return;
        }
        setDate(todayStr());
        setCustomerName("");
        setCustomerPhone("");
        setEmirate("");
        setBuildingName("");
        setFlatNo("");
        setItems([emptyItem()]);
        router.refresh();
        showToast("Work report submitted.");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassName} />
      </Field>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Customer (optional)</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className={`${inputClassName} col-span-2`}
          />
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone number"
            className={inputClassName}
          />
          <select value={emirate} onChange={(e) => setEmirate(e.target.value)} className={inputClassName}>
            <option value="">Emirate...</option>
            {EMIRATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            placeholder="Building name"
            className={inputClassName}
          />
          <input
            type="text"
            value={flatNo}
            onChange={(e) => setFlatNo(e.target.value)}
            placeholder="Flat / Villa no."
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-700">Device Inspection</h2>
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={item.deviceType}
                onChange={(e) => setItems((prev) => updateItem(prev, index, { deviceType: e.target.value }))}
                className={inputClassName}
              >
                {DEVICE_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={item.tonnage}
                onChange={(e) => setItems((prev) => updateItem(prev, index, { tonnage: e.target.value }))}
                className={inputClassName}
              >
                <option value="">Tonnage...</option>
                {TONNAGE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={item.gasType}
                onChange={(e) => setItems((prev) => updateItem(prev, index, { gasType: e.target.value }))}
                className={inputClassName}
              >
                <option value="">Gas type...</option>
                {GAS_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={item.brand}
                onChange={(e) => setItems((prev) => updateItem(prev, index, { brand: e.target.value }))}
                placeholder="Brand"
                className={inputClassName}
              />
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600 mb-1.5 block">Condition</span>
              <div className="grid grid-cols-4 gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setItems((prev) => updateItem(prev, index, { condition: c }))}
                    className={`rounded-lg border py-2 text-xs font-medium ${
                      item.condition === c
                        ? "border-blue-600 " + CONDITION_STYLES[c]
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={item.description}
              onChange={(e) => setItems((prev) => updateItem(prev, index, { description: e.target.value }))}
              rows={3}
              placeholder="Describe the problem..."
              className={inputClassName}
            />

            <div>
              <span className="text-xs font-medium text-slate-600 mb-1.5 block">
                Photos ({item.photos.length}/{MAX_PHOTOS_PER_ITEM})
              </span>
              <div className="flex flex-wrap gap-2">
                {item.photos.map((photo, photoIndex) => (
                  <div key={photoIndex} className="relative h-16 w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index, photoIndex)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {item.photos.length < MAX_PHOTOS_PER_ITEM && (
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
                        handlePhotosSelected(index, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-xs font-medium text-red-500 self-start"
              >
                Remove this device
              </button>
            )}
          </div>
        ))}

        {photoError && <p className="text-sm text-red-500">{photoError}</p>}

        <button
          type="button"
          onClick={addItem}
          className="rounded-xl border border-dashed border-slate-300 text-slate-600 text-sm font-medium py-2.5 flex items-center justify-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add Another Device
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 font-medium text-sm"
      >
        {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Submit Report"}
      </button>
    </div>
  );
}
