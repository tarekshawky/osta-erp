import { prisma } from "@/lib/prisma";
import { loadPublicPackages } from "@/lib/maintenance/data";
import { siteOrigin } from "@/lib/seo/context";
import { autoLines, buildLlmsTxt, isPublicEntry, readiness, type BranchFacts, type SyncData } from "./knowledge";

// What the other screens hold today: the Knowledge Center reads it each time and never keeps a copy.
export async function loadSyncData(): Promise<SyncData & { branches: BranchFacts[]; llmsPublished: boolean }> {
  const [settings, packages, areas, profiles, branches, llms] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" }, select: { phone: true, whatsapp: true, email: true, addressEn: true, addressAr: true, hoursEn: true, hoursAr: true } }),
    loadPublicPackages(""),
    prisma.serviceArea.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { nameEn: true, nameAr: true } }),
    prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" }, select: { platform: true, label: true, url: true } }),
    prisma.branch.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { nameEn: true, branchNameEn: true, phone: true, localityEn: true } }),
    prisma.technicalFile.findUnique({ where: { key: "llms" } }),
  ]);
  return {
    settings,
    packages: packages.packages.map((p) => ({ nameEn: p.nameEn, nameAr: p.nameAr, price: p.price, priceTextEn: p.priceTextEn ?? "", priceTextAr: p.priceTextAr ?? "", pricePrefixEn: p.pricePrefixEn ?? "", pricePrefixAr: p.pricePrefixAr ?? "", maxAcUnits: p.maxAcUnits, services: p.lines.length, suitableEn: p.suitableEn, suitableAr: p.suitableAr })),
    areas,
    profiles,
    branches: branches.map((b) => ({ name: b.branchNameEn || b.nameEn, phone: b.phone, locality: b.localityEn })),
    llmsPublished: !!(llms?.enabled && llms.content.trim()),
  };
}

// Everything the Knowledge Center screen shows.
export async function loadKnowledgeCenter() {
  const [sections, sync] = await Promise.all([
    prisma.knowledgeSection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
    loadSyncData(),
  ]);
  const now = new Date();
  const view = sections.map((s) => ({
    id: s.id, key: s.key, titleEn: s.titleEn, titleAr: s.titleAr, auto: s.auto, visible: s.visible,
    autoLines: autoLines(s.auto, sync),
    entries: s.entries.map((e) => ({
      id: e.id, sectionId: e.sectionId, type: e.type, titleEn: e.titleEn, titleAr: e.titleAr, bodyEn: e.bodyEn, bodyAr: e.bodyAr, sourceUrl: e.sourceUrl,
      verifiedAt: e.verifiedAt?.toISOString() ?? null, verifiedByName: e.verifiedByName, visible: e.visible, schemaOn: e.schemaOn, note: e.note, updatedAt: e.updatedAt.toISOString(),
    })),
  }));
  const checks = readiness({
    entries: view.flatMap((s) => s.entries.map((e) => ({ ...e, sectionVisible: s.visible }))),
    llmsPublished: sync.llmsPublished, settings: sync.settings, packages: sync.packages, branches: sync.branches, now,
  });

  // The preview holds exactly what is public: the lines read from other screens, then the checked entries.
  const published = view.filter((s) => s.visible).map((s) => ({ title: s.titleEn, lines: [...s.autoLines, ...s.entries.filter((e) => isPublicEntry(e, true))] }));
  const about = view.filter((s) => s.visible).flatMap((s) => s.entries.filter((e) => e.titleEn === "About Osta Services" && isPublicEntry(e, true)))[0];
  const llmsText = buildLlmsTxt({ siteName: "Osta Services (خدمات آسطا)", summary: about?.bodyEn ?? "", origin: siteOrigin(), sections: published });

  return { sections: view, checks, llmsText, origin: siteOrigin(), now: now.toISOString() };
}

export type KnowledgeCenterData = Awaited<ReturnType<typeof loadKnowledgeCenter>>;
export type SectionView = KnowledgeCenterData["sections"][number];
export type EntryView = SectionView["entries"][number];
