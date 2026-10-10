"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Field, inputClassName } from "@/components/FormField";
import { createBlogPost, updateBlogPost, type BlogPostFormInput } from "@/app/admin/blog/actions";

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
  authorName: "",
  published: false,
};

const textareaClassName = `${inputClassName} min-h-[140px] resize-y`;

export function BlogPostForm({
  mode = "create",
  editId,
  initial,
}: {
  mode?: "create" | "edit";
  editId?: string;
  initial?: BlogPostFormInput;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [post, setPost] = useState<BlogPostFormInput>(initial ?? emptyPost);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isValid = post.titleEn.trim().length > 0 && post.titleAr.trim().length > 0 && post.slug.trim().length > 0;

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Content (English) *">
          <textarea
            className={textareaClassName}
            value={post.contentEn}
            onChange={(e) => setPost({ ...post, contentEn: e.target.value })}
          />
        </Field>
        <Field label="المحتوى (Arabic) *" dir="rtl">
          <textarea
            className={textareaClassName}
            dir="rtl"
            value={post.contentAr}
            onChange={(e) => setPost({ ...post, contentAr: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cover Image URL">
          <input
            className={inputClassName}
            placeholder="https://..."
            value={post.coverImageUrl}
            onChange={(e) => setPost({ ...post, coverImageUrl: e.target.value })}
          />
        </Field>
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
