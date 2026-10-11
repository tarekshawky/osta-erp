import { prisma } from "@/lib/prisma";
import { textUsesAsset } from "./process";

export type Usage = { source: string; label: string; href: string; live: boolean };

type Source = Usage & { text: string };

// Every place content can reference an uploaded image. `live` means visitors would see a broken image
// if the file were deleted (published pages, site settings, live blog/service/homepage content).
async function collectSources(): Promise<Source[]> {
  const [pages, settings, posts, services, sections, bookable] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { deletedAt: null },
      select: { id: true, titleEn: true, status: true, draftBlocks: true, draftSeo: true, publishedVersion: { select: { blocks: true, seo: true } } },
    }),
    prisma.siteSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true, faviconUrl: true } }),
    prisma.blogPost.findMany({ select: { id: true, titleEn: true, published: true, coverImageUrl: true, contentEn: true, contentAr: true } }),
    prisma.servicePage.findMany({ select: { id: true, nameEn: true, published: true, coverImageUrl: true, contentEn: true, contentAr: true } }),
    prisma.homeSection.findMany({ select: { id: true, key: true, enabled: true, imageUrl: true, items: { select: { imageUrl: true } } } }),
    prisma.bookableService.findMany({ select: { id: true, nameEn: true, imageUrl: true } }),
  ]);

  const out: Source[] = [];
  for (const p of pages) {
    const href = `/admin/website/pages/${p.id}`;
    out.push({ source: "Page draft", label: p.titleEn, href, live: false, text: JSON.stringify([p.draftBlocks, p.draftSeo]) });
    if (p.publishedVersion) out.push({ source: "Published page", label: p.titleEn, href, live: true, text: JSON.stringify([p.publishedVersion.blocks, p.publishedVersion.seo]) });
  }
  if (settings) out.push({ source: "Site settings", label: "Logo / favicon", href: "/admin/website/site", live: true, text: `${settings.logoUrl} ${settings.faviconUrl}` });
  for (const b of posts) out.push({ source: "Blog post", label: b.titleEn, href: `/admin/blog/${b.id}/edit`, live: b.published, text: `${b.coverImageUrl ?? ""} ${b.contentEn} ${b.contentAr}` });
  for (const s of services) out.push({ source: "Service page", label: s.nameEn, href: `/admin/services/${s.id}/edit`, live: s.published, text: `${s.coverImageUrl ?? ""} ${s.contentEn} ${s.contentAr}` });
  for (const h of sections) out.push({ source: "Homepage section", label: h.key, href: `/admin/home-sections/${h.id}/edit`, live: h.enabled, text: `${h.imageUrl ?? ""} ${h.items.map((i) => i.imageUrl ?? "").join(" ")}` });
  for (const s of bookable) out.push({ source: "Bookable service", label: s.nameEn, href: "/admin/pricing", live: true, text: s.imageUrl ?? "" });
  return out;
}

// Usages for many assets from a single scan of the content (used for "unused" badges on the grid).
export async function usagesFor(assetIds: string[]): Promise<Map<string, Usage[]>> {
  const sources = await collectSources();
  const map = new Map<string, Usage[]>();
  for (const id of assetIds) {
    map.set(
      id,
      sources.filter((s) => textUsesAsset(s.text, id)).map(({ text: _text, ...usage }) => { void _text; return usage; })
    );
  }
  return map;
}

export const blockingUsages = (usages: Usage[]) => usages.filter((u) => u.live);
