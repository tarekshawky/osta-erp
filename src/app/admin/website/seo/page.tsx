import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { scoreStyle } from "@/components/cms/SeoPanel";
import { seoReport } from "@/lib/seo/report";

export default async function SeoOverviewPage() {
  await requireEmployee("ADMIN");
  const rows = (await seoReport()).sort((a, b) => a.score - b.score);
  const all = rows.flatMap((r) => r.issues.map((i) => ({ ...i, page: r })));
  const broken = all.filter((i) => i.id.startsWith("broken-link-"));
  const dups = all.filter((i) => i.id.startsWith("dup-"));
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : null;

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · SEO" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">SEO overview</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Scores check each page&apos;s current draft: titles, descriptions, headings, image text, links and duplicates. A score is a guide, not a ranking promise.</p>

        <div className="mb-6 grid max-w-2xl grid-cols-3 gap-3">
          {[["Pages", rows.length], ["Average score", avg ?? "—"], ["Broken links", broken.length]].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">{n}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr><th className="px-4 py-3">Page</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Top issues</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No pages yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{r.titleEn}</p><p className="font-mono text-xs text-slate-400">/{r.slug} · {r.status}</p></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreStyle(r.score)}`}>{r.score}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.issues.length === 0 ? <span className="text-emerald-600">All good</span> : (
                      <ul className="flex flex-col gap-1">{r.issues.slice(0, 3).map((i) => <li key={i.id}>• {i.message}</li>)}{r.issues.length > 3 && <li className="text-slate-400">+{r.issues.length - 3} more</li>}</ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/website/pages/${r.id}`} className="text-sm font-medium text-blue-600">Fix</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(broken.length > 0 || dups.length > 0) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Broken internal links</h3>
              {broken.length === 0 ? <p className="text-xs text-emerald-600">None found.</p> : <ul className="flex flex-col gap-1 text-xs text-slate-600">{broken.map((b, i) => <li key={i}><Link href={`/admin/website/pages/${b.page.id}`} className="font-medium text-blue-600">{b.page.titleEn}</Link>: {b.message.replace("Broken internal link: ", "")}</li>)}</ul>}
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Duplicate titles &amp; descriptions</h3>
              {dups.length === 0 ? <p className="text-xs text-emerald-600">None found.</p> : <ul className="flex flex-col gap-1 text-xs text-slate-600">{dups.map((d, i) => <li key={i}><Link href={`/admin/website/pages/${d.page.id}`} className="font-medium text-blue-600">{d.page.titleEn}</Link>: {d.message}</li>)}</ul>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
