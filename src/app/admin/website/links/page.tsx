import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { LinkReport, type PageLinks } from "@/components/cms/LinkReport";
import { parseBlocks } from "@/lib/cms/blocks";
import { collectLinks } from "@/lib/seo/analyze";

const clean = (l: string) => (l.split(/[?#]/)[0].replace(/\/+$/, "") || "/");

export default async function LinksPage() {
  await requireEmployee("ADMIN");
  const [pages, backlinks] = await Promise.all([
    prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, titleEn: true, slug: true, draftBlocks: true } }),
    prisma.backlink.findMany({ where: { status: "ACTIVE" }, select: { targetUrl: true } }),
  ]);

  const outbound = pages.map((p) => {
    const parsed = parseBlocks(p.draftBlocks);
    const links = collectLinks(parsed.ok ? parsed.blocks : []);
    return { p, internal: [...new Set(links.filter((l) => l.startsWith("/") && !l.startsWith("//")))], external: [...new Set(links.filter((l) => /^https?:\/\//.test(l)))] };
  });

  // Who links to each address, built once (comparing every page with every other page is far too slow for hundreds of pages).
  const inbound = new Map<string, { id: string; title: string }[]>();
  for (const o of outbound) for (const l of new Set(o.internal.map(clean))) {
    const list = inbound.get(l) ?? [];
    list.push({ id: o.p.id, title: o.p.titleEn });
    inbound.set(l, list);
  }
  const backlinkCount = new Map<string, number>();
  for (const b of backlinks) backlinkCount.set(clean(b.targetUrl), (backlinkCount.get(clean(b.targetUrl)) ?? 0) + 1);

  const rows: PageLinks[] = outbound.map(({ p, internal, external }) => ({
    id: p.id, title: p.titleEn, slug: p.slug, internalOut: internal, external,
    // a page linking to itself doesn't count
    internalIn: (inbound.get(`/${p.slug}`) ?? []).filter((x) => x.id !== p.id).map((x) => x.title),
    backlinks: backlinkCount.get(`/${p.slug}`) ?? 0,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Links" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Page links</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">For each page: where it links to, which of your pages link to it, and how many active backlinks point at it. Pages nothing links to are hard to find.</p>
        <LinkReport pages={rows} />
      </div>
    </div>
  );
}
