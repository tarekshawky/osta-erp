"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import {
  updateHomeSection,
  type HomeSectionFormInput,
  type HomeSectionItemInput,
} from "@/app/admin/home-sections/actions";

const emptyItem: HomeSectionItemInput = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  iconName: "",
  imageUrl: "",
  linkUrl: "",
  displayOrder: "0",
};

export function HomeSectionForm({ id, initial }: { id: string; initial: HomeSectionFormInput }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [section, setSection] = useState<HomeSectionFormInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, patch: Partial<HomeSectionItemInput>) {
    setSection((s) => ({
      ...s,
      items: s.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setSection((s) => ({ ...s, items: [...s.items, { ...emptyItem, displayOrder: String(s.items.length) }] }));
  }

  function removeItem(index: number) {
    setSection((s) => ({ ...s, items: s.items.filter((_, i) => i !== index) }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateHomeSection(id, section);
      if (res.ok) {
        showToast("Section updated.");
        router.push("/admin/home-sections");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => setSection({ ...section, enabled: e.target.checked })}
        />
        Enabled (visible on the website)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Heading (English) *">
          <input
            className={inputClassName}
            value={section.headingEn}
            onChange={(e) => setSection({ ...section, headingEn: e.target.value })}
          />
        </Field>
        <Field label="العنوان (Arabic) *" dir="rtl">
          <input
            className={inputClassName}
            dir="rtl"
            value={section.headingAr}
            onChange={(e) => setSection({ ...section, headingAr: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description (English)">
          <textarea
            className={`${inputClassName} min-h-24`}
            value={section.descriptionEn}
            onChange={(e) => setSection({ ...section, descriptionEn: e.target.value })}
          />
        </Field>
        <Field label="الوصف (Arabic)" dir="rtl">
          <textarea
            className={`${inputClassName} min-h-24`}
            dir="rtl"
            value={section.descriptionAr}
            onChange={(e) => setSection({ ...section, descriptionAr: e.target.value })}
          />
        </Field>
      </div>

      <ImageUploadField
        label="Image"
        value={section.imageUrl}
        onChange={(imageUrl) => setSection({ ...section, imageUrl })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Button Text (English)">
          <input
            className={inputClassName}
            value={section.ctaLabelEn}
            onChange={(e) => setSection({ ...section, ctaLabelEn: e.target.value })}
          />
        </Field>
        <Field label="نص الزر (Arabic)" dir="rtl">
          <input
            className={inputClassName}
            dir="rtl"
            value={section.ctaLabelAr}
            onChange={(e) => setSection({ ...section, ctaLabelAr: e.target.value })}
          />
        </Field>
        <Field label="Button Link">
          <input
            className={inputClassName}
            placeholder="/services or https://..."
            value={section.ctaUrl}
            onChange={(e) => setSection({ ...section, ctaUrl: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-2 border-t border-slate-200 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Items</h3>
          <button type="button" onClick={addItem} className="text-sm font-medium text-blue-600">
            + Add Item
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {section.items.length === 0 && <p className="text-sm text-slate-400">No items yet.</p>}
          {section.items.map((item, index) => (
            <div key={item.id ?? `new-${index}`} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Item {index + 1}</span>
                <button type="button" onClick={() => removeItem(index)} className="text-xs font-medium text-red-600">
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title (English) *">
                  <input
                    className={inputClassName}
                    value={item.titleEn}
                    onChange={(e) => updateItem(index, { titleEn: e.target.value })}
                  />
                </Field>
                <Field label="العنوان (Arabic) *" dir="rtl">
                  <input
                    className={inputClassName}
                    dir="rtl"
                    value={item.titleAr}
                    onChange={(e) => updateItem(index, { titleAr: e.target.value })}
                  />
                </Field>
                <Field label="Description (English)">
                  <textarea
                    className={`${inputClassName} min-h-16`}
                    value={item.descriptionEn}
                    onChange={(e) => updateItem(index, { descriptionEn: e.target.value })}
                  />
                </Field>
                <Field label="الوصف (Arabic)" dir="rtl">
                  <textarea
                    className={`${inputClassName} min-h-16`}
                    dir="rtl"
                    value={item.descriptionAr}
                    onChange={(e) => updateItem(index, { descriptionAr: e.target.value })}
                  />
                </Field>
                <Field label="Icon name (lucide-react)">
                  <input
                    className={inputClassName}
                    placeholder="ShieldCheck"
                    disabled={Boolean(item.imageUrl)}
                    value={item.iconName}
                    onChange={(e) => updateItem(index, { iconName: e.target.value })}
                  />
                </Field>
                <Field label="Display Order">
                  <input
                    className={inputClassName}
                    inputMode="numeric"
                    value={item.displayOrder}
                    onChange={(e) => updateItem(index, { displayOrder: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <ImageUploadField
                    label="Image (overrides icon)"
                    value={item.imageUrl}
                    onChange={(imageUrl) => updateItem(index, { imageUrl, iconName: imageUrl ? "" : item.iconName })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/home-sections")}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
