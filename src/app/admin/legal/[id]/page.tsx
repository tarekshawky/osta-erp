import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LegalBody } from "@/components/legal/LegalBody";
import { KIND_LABEL, arabicProgress, fillKnownFields, numberSections, publishProblems, readSections, readSeo, readingMinutes, sectionFieldKeys, type DocKind, type FieldValue } from "@/lib/legal/content";

export default async function LegalDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const lang = (await searchParams).lang === "ar" ? "ar" : "en";
  const doc = await prisma.legalDocument.findUnique({ where: { id }, include: { category: true, versions: { orderBy: { version: "desc" }, select: { version: true, publishedAt: true, changeNote: true } } } });
  if (!doc) notFound();
  const fieldRows = await prisma.legalField.findMany();
  const fields: Record<string, FieldValue> = Object.fromEntries(fieldRows.map((f) => [f.key, { valueEn: f.valueEn, valueAr: f.valueAr, confirmed: f.confirmed }]));
  const sections = readSections(doc.draftSections);
  const seo = readSeo(doc.draftSeo);
  const numbers = numberSections(sections);
  const problems = publishProblems({ titleEn: doc.titleEn, titleAr: doc.titleAr, summaryEn: doc.summaryEn, summaryAr: doc.summaryAr, draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr, sections, seo }, fields);
  const used = sectionFieldKeys({ draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr, sections });
  const ar = lang === "ar";
  // Confirmed decisions are shown with their value; only the open ones stay highlighted.
  const values: Record<string, string> = {};
  for (const f of fieldRows) if (f.confirmed) values[f.key] = ar ? f.valueAr : f.valueEn;
  const show = (t: string) => fillKnownFields(t, values);
  const allText = sections.map((s) => (ar ? s.bodyAr : s.bodyEn)).join(" ");

  return (
    <div className="pb-10">
      <AdminTopBar title="Legal Center" />
      <div className="space-y-5 px-6 py-6">
        <Link href="/admin/legal" className="text-sm font-medium text-blue-600">← Legal Center</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{doc.code} · Category {doc.category.key} · {doc.category.nameEn}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{doc.titleEn}</h2>
            <p dir="rtl" className="text-slate-600">{doc.titleAr}</p>
            <p className="mt-1 text-xs text-slate-500">Address: /policies/{doc.slug} · {KIND_LABEL[doc.kind as DocKind]} · {doc.status[0] + doc.status.slice(1).toLowerCase()} · Arabic {arabicProgress({ draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr, titleAr: doc.titleAr, sections })}% · about {readingMinutes(allText)} min read</p>
          </div>
          <div className="flex gap-2">
            {(["en", "ar"] as const).map((l) => (
              <Link key={l} href={`/admin/legal/${doc.id}?lang=${l}`} className={`rounded-lg px-4 py-2 text-sm font-semibold ${lang === l ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>{l === "en" ? "English" : "العربية"}</Link>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${problems.length ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="text-sm font-semibold text-slate-900">{problems.length ? `Not ready to publish (${problems.length})` : "Ready to publish"}</p>
          {problems.length > 0 && <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">{problems.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}{problems.length > 8 && <li>…and {problems.length - 8} more.</li>}</ul>}
          {used.length > 0 && <p className="mt-2 text-xs text-slate-600">Decisions used: {used.map((k) => `{{${k}}}`).join(", ")}. <Link href="/admin/legal/fields" className="font-medium text-blue-600">Confirm them</Link></p>}
          <p className="mt-2 text-xs text-slate-500">Publishing, editing and version history are added in the next step. This page shows the draft as it is stored.</p>
        </div>

        <article dir={ar ? "rtl" : "ltr"} className="rounded-xl border border-slate-200 bg-white p-6">
          {(ar ? doc.draftIntroAr : doc.draftIntroEn) && <div className="mb-6 border-b border-slate-100 pb-5"><LegalBody text={show(ar ? doc.draftIntroAr : doc.draftIntroEn)} /></div>}
          <div className="space-y-6">
            {sections.map((s, i) => {
              const heading = show(ar ? s.headingAr : s.headingEn);
              const body = show(ar ? s.bodyAr : s.bodyEn);
              return s.level === 1 ? (
                <div key={s.id} className="border-t border-slate-200 pt-5"><h3 className="text-lg font-bold text-slate-900">{heading}</h3>{body && <div className="mt-2"><LegalBody text={body} /></div>}</div>
              ) : (
                <div key={s.id}><h4 className={`font-semibold text-slate-900 ${s.level === 3 ? "text-sm" : ""}`}><span className="text-slate-400">{numbers[i]}.</span> {heading}</h4><div className="mt-1"><LegalBody text={body} /></div></div>
              );
            })}
          </div>
        </article>

        {doc.versions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-900">Published versions</p><ul className="mt-2 text-sm text-slate-600">{doc.versions.map((v) => <li key={v.version}>v{v.version} · {v.publishedAt.toLocaleDateString("en-GB")} {v.changeNote && `· ${v.changeNote}`}</li>)}</ul></div>
        )}
      </div>
    </div>
  );
}
