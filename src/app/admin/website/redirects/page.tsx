import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { RedirectManager } from "@/components/cms/RedirectManager";

const STATIC = ["/", "/services", "/pricing", "/blog", "/about", "/contact"];

export default async function RedirectsPage() {
  await requireEmployee("ADMIN");
  const [redirects, pages, posts, services] = await Promise.all([
    prisma.cmsRedirect.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.cmsPage.findMany({ where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { isNot: null } }, select: { showInSitemap: true, publishedVersion: { select: { slug: true, seo: true } } } }),
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true } }),
    prisma.servicePage.findMany({ where: { published: true }, select: { slug: true } }),
  ]);
  const cms = pages.map((p) => ({ url: `/${p.publishedVersion!.slug}`, listed: p.showInSitemap && !(p.publishedVersion!.seo as { noindex?: boolean } | null)?.noindex, why: !p.showInSitemap ? "turned off" : (p.publishedVersion!.seo as { noindex?: boolean } | null)?.noindex ? "noindex" : "" }));
  const included = [...STATIC, ...services.map((s) => `/services/${s.slug}`), ...posts.map((b) => `/blog/${b.slug}`), ...cms.filter((c) => c.listed).map((c) => c.url)];
  const excluded = cms.filter((c) => !c.listed);

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Redirects & Sitemap" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Redirects</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Send an old address to a new one (301, permanent). Renaming a published page adds one automatically.</p>
        <RedirectManager rows={redirects.map((r) => ({ id: r.id, from: r.fromPath, to: r.toPath, created: r.createdAt.toISOString().slice(0, 10) }))} />

        <h2 className="mb-1 mt-10 text-2xl font-bold text-slate-900">Sitemap</h2>
        <p className="mb-4 max-w-2xl text-sm text-slate-500">
          What search engines are told about at <span className="font-mono">/sitemap.xml</span>: published pages that are allowed in the sitemap and not hidden from search engines.
        </p>
        <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Included ({included.length})</h3>
            <ul className="max-h-72 overflow-auto font-mono text-xs text-slate-600">{included.map((u) => <li key={u}>{u}</li>)}</ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Published but left out ({excluded.length})</h3>
            {excluded.length === 0 ? <p className="text-xs text-slate-400">None.</p> : <ul className="font-mono text-xs text-slate-600">{excluded.map((c) => <li key={c.url}>{c.url} <span className="font-sans text-slate-400">({c.why})</span></li>)}</ul>}
          </section>
        </div>
      </div>
    </div>
  );
}
