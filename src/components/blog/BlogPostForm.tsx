"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { BlocksEditor } from "@/components/cms/BlocksEditor";
import { LinkTargetsContext, type LinkTarget } from "@/components/cms/LinkInserter";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { createBlogPost, updateBlogPost, type BlogPostFormInput } from "@/app/admin/blog/actions";
import { createBlogCategoryQuick } from "@/app/admin/blog/category-actions";

export type CategoryOption = { id: string; nameEn: string; nameAr: string; active: boolean };

const emptyPost: BlogPostFormInput = {
  slug: "",
  titleEn: "",
  titleAr: "",
  excerptEn: "",
  excerptAr: "",
  contentEn: "",
  contentAr: "",
  coverImageUrl: "",
  seoTitleEn: "",
  seoTitleAr: "",
  seoDescriptionEn: "",
  seoDescriptionAr: "",
  seoKeywordsEn: "",
  seoKeywordsAr: "",
  authorName: "",
  blocks: [],
  categoryId: "",
  secondaryCategoryIds: [],
  featured: false,
  published: false,
};

export function BlogPostForm({
  mode = "create",
  editId,
  initial,
  linkTargets,
  categories: initialCategories = [],
}: {
  mode?: "create" | "edit";
  editId?: string;
  initial?: BlogPostFormInput;
  linkTargets?: LinkTarget[];
  categories?: CategoryOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [post, setPost] = useState<BlogPostFormInput>(initial ?? emptyPost);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState({ en: "", ar: "" });
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Creates the category on the spot; it joins the list and is selected straight away.
  async function createCategory() {
    setCategoryError(null);
    setCreatingBusy(true);
    const r = await createBlogCategoryQuick({ nameEn: newName.en, nameAr: newName.ar });
    setCreatingBusy(false);
    if (!r.ok || !r.category) return setCategoryError(r.error ?? "Could not create the category.");
    setCategories((list) => [...list, { id: r.category!.id, nameEn: r.category!.nameEn, nameAr: r.category!.nameAr, active: true }]);
    setPost((p) => ({ ...p, categoryId: r.category!.id }));
    setNewName({ en: "", ar: "" });
    setCreating(false);
    showToast("Category created and selected.");
  }

  const isValid = post.titleEn.trim().length > 0 && post.titleAr.trim().length > 0 && post.slug.trim().length > 0 && post.categoryId !== "";

  function submit() {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "edit" && editId ? await updateBlogPost(editId, post) : await createBlogPost(post);
      if (res.ok) {
        showToast(mode === "edit" ? "Blog post updated." : "Blog post created.");
        router.push("/admin/blog");
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
          placeholder="ac-repair-tips"
          value={post.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setPost({ ...post, slug: e.target.value });
          }}
        />
      </Field>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Field label="Category *">
          <select className={inputClassName} value={post.categoryId} onChange={(e) => { if (e.target.value === "__new") setCreating(true); else setPost({ ...post, categoryId: e.target.value, secondaryCategoryIds: post.secondaryCategoryIds.filter((id) => id !== e.target.value) }); }}>
            <option value="">Choose a category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn} — {c.nameAr}{c.active ? "" : " (inactive)"}</option>)}
            <option value="__new">+ Create New Category</option>
          </select>
        </Field>
        {creating && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">New category (you can add descriptions and SEO later in Blog → Categories)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClassName} placeholder="Name (English)" value={newName.en} onChange={(e) => setNewName({ ...newName, en: e.target.value })} />
              <input className={inputClassName} dir="rtl" placeholder="الاسم بالعربية" value={newName.ar} onChange={(e) => setNewName({ ...newName, ar: e.target.value })} />
            </div>
            {categoryError && <p className="text-xs text-red-600">{categoryError}</p>}
            <div className="flex gap-3">
              <button type="button" disabled={creatingBusy} onClick={createCategory} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{creatingBusy ? "Creating…" : "Create category"}</button>
              <button type="button" onClick={() => { setCreating(false); setCategoryError(null); }} className="text-xs font-medium text-slate-500">Cancel</button>
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">Also show in (optional)</p>
          <div className="flex flex-wrap gap-2">
            {categories.filter((c) => c.id !== post.categoryId).map((c) => {
              const on = post.secondaryCategoryIds.includes(c.id);
              return (
                <label key={c.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${on ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
                  <input type="checkbox" className="hidden" checked={on} onChange={(e) => setPost({ ...post, secondaryCategoryIds: e.target.checked ? [...post.secondaryCategoryIds, c.id] : post.secondaryCategoryIds.filter((id) => id !== c.id) })} />
                  {on ? "✓ " : ""}{c.nameEn}
                </label>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={post.featured} onChange={(e) => setPost({ ...post, featured: e.target.checked })} /> Featured article (shown in the Featured section of the blog)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (English) *">
          <input
            className={inputClassName}
            value={post.titleEn}
            onChange={(e) => {
              const titleEn = e.target.value;
              setPost((p) => ({
                ...p,
                titleEn,
                slug: slugTouched ? p.slug : titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              }));
            }}
          />
        </Field>
        <Field label="العنوان (Arabic) *" dir="rtl">
          <input
            className={inputClassName}
            dir="rtl"
            value={post.titleAr}
            onChange={(e) => setPost({ ...post, titleAr: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Excerpt (English) *">
          <textarea
            className={`${inputClassName} min-h-20`}
            value={post.excerptEn}
            onChange={(e) => setPost({ ...post, excerptEn: e.target.value })}
          />
        </Field>
        <Field label="المقتطف (Arabic) *" dir="rtl">
          <textarea
            className={`${inputClassName} min-h-20`}
            dir="rtl"
            value={post.excerptAr}
            onChange={(e) => setPost({ ...post, excerptAr: e.target.value })}
          />
        </Field>
      </div>

      <LinkTargetsContext.Provider value={linkTargets ?? []}>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-600">Main text — optional when you add blocks below / النص الرئيسي — اختياري عند إضافة أقسام</span>
          <RichTextEditor value={post.contentEn} onChange={(v) => setPost({ ...post, contentEn: v })} placeholder="Write in English…" />
          <RichTextEditor dir="rtl" value={post.contentAr} onChange={(v) => setPost({ ...post, contentAr: v })} placeholder="اكتب بالعربية…" />
        </div>
      </LinkTargetsContext.Provider>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Article content (blocks)</h3>
          <p className="text-xs text-slate-500">Build the article from blocks: Text, Image + text, FAQ, Call to action, Hero and more. When there are blocks they are shown on the article instead of the plain text above.</p>
        </div>
        <BlocksEditor blocks={post.blocks} onChange={(blocks) => setPost({ ...post, blocks })} linkTargets={linkTargets} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField
          label="Cover Image"
          value={post.coverImageUrl}
          onChange={(coverImageUrl) => setPost({ ...post, coverImageUrl })}
        />
        <Field label="Author Name">
          <input
            className={inputClassName}
            value={post.authorName}
            onChange={(e) => setPost({ ...post, authorName: e.target.value })}
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
                value={post.seoTitleEn}
                onChange={(e) => setPost({ ...post, seoTitleEn: e.target.value })}
              />
            </Field>
            <Field label="عنوان السيو (Arabic)" dir="rtl">
              <input
                className={inputClassName}
                dir="rtl"
                value={post.seoTitleAr}
                onChange={(e) => setPost({ ...post, seoTitleAr: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO Description (English)">
              <textarea
                className={`${inputClassName} min-h-20`}
                value={post.seoDescriptionEn}
                onChange={(e) => setPost({ ...post, seoDescriptionEn: e.target.value })}
              />
            </Field>
            <Field label="وصف السيو (Arabic)" dir="rtl">
              <textarea
                className={`${inputClassName} min-h-20`}
                dir="rtl"
                value={post.seoDescriptionAr}
                onChange={(e) => setPost({ ...post, seoDescriptionAr: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Keywords (English)">
              <textarea
                className={`${inputClassName} min-h-16`}
                placeholder="e.g. painting services uae, villa painting, apartment painting"
                value={post.seoKeywordsEn}
                onChange={(e) => setPost({ ...post, seoKeywordsEn: e.target.value })}
              />
              <span className="mt-1 block text-xs text-slate-500">Separate keywords with commas.</span>
            </Field>
            <Field label="الكلمات المفتاحية (Arabic)" dir="rtl">
              <textarea
                className={`${inputClassName} min-h-16`}
                dir="rtl"
                placeholder="مثال: دهانات الإمارات، دهان فلل، دهان شقق"
                value={post.seoKeywordsAr}
                onChange={(e) => setPost({ ...post, seoKeywordsAr: e.target.value })}
              />
              <span className="mt-1 block text-xs text-slate-500">افصل بين الكلمات بفاصلة (، أو ,)</span>
            </Field>
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={post.published}
          onChange={(e) => setPost({ ...post, published: e.target.checked })}
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
          {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Blog Post"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/blog")}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
