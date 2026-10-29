import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { jobPublicUrl, jobsListUrl } from "@/lib/jobs/urls";

export const dynamic = "force-dynamic";

// /jobs and every job that is open for applications. Drafts, closed, completed and cancelled jobs are left out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const jobs = await prisma.job.findMany({
    where: { status: "PUBLISHED", slug: { not: null }, OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 5000,
  });
  return [{ url: jobsListUrl(), lastModified: now, changeFrequency: "daily", priority: 0.8 }, ...jobs.map((j) => ({ url: jobPublicUrl(j.slug!), lastModified: j.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 }))];
}
