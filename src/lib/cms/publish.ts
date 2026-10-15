import { prisma } from "@/lib/prisma";

// Best-effort: ask the public site to refresh its cached copy. Never blocks or fails an edit.
export async function revalidateSite(slugs: string[]) {
  const base = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "site" refreshes the shared header/footer data, so a new page's menu link appears at once too.
      body: JSON.stringify({ secret, paths: slugs.map((s) => (s ? `/${s}` : "/")), tags: ["site", "blog"] }),
    });
  } catch {
    // The site's own short cache window (60s) catches up anyway.
  }
}

// Scheduled pages go live when publishAt passes. Called lazily by the public API and by the optional cron route,
// so scheduling works even on plans without frequent cron.
export async function promoteDueScheduledPages(now = new Date()): Promise<string[]> {
  const due = await prisma.cmsPage.findMany({
    where: { status: "SCHEDULED", publishAt: { lte: now }, scheduledVersionId: { not: null }, deletedAt: null },
    include: { publishedVersion: { select: { slug: true } } },
  });
  const slugs: string[] = [];
  for (const page of due) {
    const version = await prisma.cmsPageVersion.findUnique({ where: { id: page.scheduledVersionId! } });
    if (!version) continue;
    const clash = await prisma.cmsPage.findFirst({
      where: { id: { not: page.id }, status: "PUBLISHED", deletedAt: null, publishedVersion: { slug: version.slug } },
    });
    if (clash) continue; // another page took this URL; leave scheduled for an admin to resolve
    const oldSlug = page.publishedVersion?.slug;
    if (oldSlug && oldSlug !== version.slug) {
      await prisma.cmsRedirect.upsert({
        where: { fromPath: `/${oldSlug}` },
        update: { toPath: `/${version.slug}` },
        create: { fromPath: `/${oldSlug}`, toPath: `/${version.slug}` },
      });
    }
    await prisma.cmsPage.update({
      where: { id: page.id },
      data: { status: "PUBLISHED", publishedVersionId: version.id, scheduledVersionId: null, publishAt: null },
    });
    slugs.push(version.slug);
  }
  if (slugs.length) await revalidateSite(slugs);
  return slugs;
}
