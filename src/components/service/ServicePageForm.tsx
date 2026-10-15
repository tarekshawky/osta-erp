"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { BlocksEditor } from "@/components/cms/BlocksEditor";
import { LinkTargetsContext, type LinkTarget } from "@/components/cms/LinkInserter";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { createServicePage, updateServicePage, type ServicePageFormInput } from "@/app/admin/services/actions";

const emptyService: ServicePageFormInput = {
  slug: "",
  nameEn: "",
  nameAr: "",
  shortDescriptionEn: "",
  shortDescriptionAr: "",
  contentEn: "",
  contentAr: "",
  iconName: "",
  coverImageUrl: "",
  priceFrom: "",
  priceNote: "",
  seoTitleEn: "",
  seoTitleAr: "",
  seoDescriptionEn: "",
  seoDescriptionAr: "",
  seoKeywordsEn: "",
  seoKeywordsAr: "",
  displayOrder: "0",
  blocks: [],
  published: true,
};

const textareaClassName = `${inputClassName} min-h-[140px] resize-y`;

export function ServicePageForm({
  mode = "create",
  editId,
  initial,
  linkTargets,
}: {
  mode?: "create" | "edit";
  editId?: string;
  initial?: ServicePageFormInput;
  linkTargets?: LinkTarget[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [service, setService] = useState<ServicePageFormInput>(initial ?? emptyService);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValid = service.nameEn.trim().length > 0 && service.nameAr.trim().length > 0 && service.slug.trim().length > 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "edit" && editId ? await updateServicePage(editId, service) : await createServicePage(service);
      if (res.ok) {
        showToast(mode === "edit" ? "Service page updated." : "Service page created.");
        router.push("/admin/services");
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <Field label="Slug (URL path) *">
        <input
          className={inputClassName}
          placeholder="ac-repair"
          value={service.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setService({ ...service, slug: e.target.value });
          }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English) *">
          <input
            className={inputClassName}
            value={service.nameEn}
            onChange={(e) => {
              const nameEn = e.target.value;
              setService((s) => ({
                ...s,
                nameEn,
                slug: slugTouched ? s.slug : nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              }));
            }}
          />
        </Field>
        <Field label="الاسم (Arabic) *" dir="rtl">
          <input
            className={inputClassName}
            dir="rtl"
            value={service.nameAr}
            onChange={(e) => setService({ ...service, nameAr: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Short Description (English) *">
          <textarea
            className={`${inputClassName} min-h-20`}
            value={service.shortDescriptionEn}
            onChange={(e) => setService({ ...service, shortDescriptionEn: e.target.value })}
          />
        </Field>
        <Field label="وصف مختصر (Arabic) *" dir="rtl">
          <textarea
            className={`${inputClassName} min-h-20`}
            dir="rtl"
            value={service.shortDescriptionAr}
            onChange={(e) => setService({ ...service, shortDescriptionAr: e.target.value })}
          />
        </Field>
      </div>

      <LinkTargetsContext.Provider value={linkTargets ?? []}>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Main text — optional when you add blocks below / النص الرئيسي — اختياري عند إضافة أقسام</span>
          <RichTextEditor value={service.contentEn} onChange={(v) => setService({ ...service, contentEn: v })} placeholder="Write in English…" />
          <RichTextEditor dir="rtl" value={service.contentAr} onChange={(v) => setService({ ...service, contentAr: v })} placeholder="اكتب بالعربية…" />
        </div>
      </LinkTargetsContext.Provider>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Service page content (blocks)</h3>
          <p className="text-xs text-slate-500">Build the page from blocks: Text, Image + text, FAQ, Call to action, Hero and more. When there are blocks they are shown on the service page instead of the plain text above.</p>
        </div>
        <BlocksEditor blocks={service.blocks} onChange={(blocks) => setService({ ...service, blocks })} linkTargets={linkTargets} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price From (AED)">
          <input
            className={inputClassName}
            placeholder="150"
            inputMode="decimal"
            value={service.priceFrom}
            onChange={(e) => setService({ ...service, priceFrom: e.target.value })}
          />
        </Field>
        <Field label="Price Note">
          <input
            className={inputClassName}
            placeholder="Starting from, per unit"
            value={service.priceNote}
            onChange={(e) => setService({ ...service, priceNote: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField
          label="Cover Image"
          value={service.coverImageUrl}
          onChange={(coverImageUrl) => setService({ ...service, coverImageUrl })}
        />
        <Field label="Display Order (lower = first)">
          <input
            className={inputClassName}
            inputMode="numeric"
            value={service.displayOrder}
            onChange={(e) => setService({ ...service, displayOrder: e.target.value })}
          />
        </Field>
      </div>

      <details className="rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">SEO (optional)</summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO Title (English)">
              <input
                className={inputClassName}
                value={service.seoTitleEn}
                onChange={(e) => setService({ ...service, seoTitleEn: e.target.value })}
              />
            </Field>
            <Field label="عنوان السيو (Arabic)" dir="rtl">
              <input
                className={inputClassName}
                dir="rtl"
                value={service.seoTitleAr}
                onChange={(e) => setService({ ...service, seoTitleAr: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO Description (English)">
              <textarea
                className={`${inputClassName} min-h-20`}
                value={service.seoDescriptionEn}
                onChange={(e) => setService({ ...service, seoDescriptionEn: e.target.value })}
              />
            </Field>
            <Field label="وصف السيو (Arabic)" dir="rtl">
              <textarea
                className={`${inputClassName} min-h-20`}
                dir="rtl"
                value={service.seoDescriptionAr}
                onChange={(e) => setService({ ...service, seoDescriptionAr: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Keywords (English)">
              <textarea
                className={`${inputClassName} min-h-16`}
                placeholder="e.g. painting services uae, villa painting, apartment painting"
                value={service.seoKeywordsEn}
                onChange={(e) => setService({ ...service, seoKeywordsEn: e.target.value })}
              />
              <span className="mt-1 block text-xs text-slate-500">Separate keywords with commas.</span>
            </Field>
            <Field label="الكلمات المفتاحية (Arabic)" dir="rtl">
              <textarea
                className={`${inputClassName} min-h-16`}
                dir="rtl"
                placeholder="مثال: دهانات الإمارات، دهان فلل، دهان شقق"
                value={service.seoKeywordsAr}
                onChange={(e) => setService({ ...service, seoKeywordsAr: e.target.value })}
              />
              <span className="mt-1 block text-xs text-slate-500">افصل بين الكلمات بفاصلة (، أو ,)</span>
            </Field>
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={service.published}
          onChange={(e) => setService({ ...service, published: e.target.checked })}
        />
        Published (visible on the website)
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={submit}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Service Page"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/services")}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
