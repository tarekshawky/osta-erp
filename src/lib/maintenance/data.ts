import { prisma } from "@/lib/prisma";
import { buildComparison, termsList, type Bullet, type CtaMode, type Pkg, type PkgLine, type PkgService, type PkgSettings } from "./packages";

const EMPTY_SETTINGS: PkgSettings = { headingEn: "", headingAr: "", subtitleEn: "", subtitleAr: "", noteEn: "", noteAr: "", termsEn: "", termsAr: "" };

export const asLines = (raw: unknown): PkgLine[] =>
  (Array.isArray(raw) ? raw : []).flatMap((l) => {
    const o = l as Partial<PkgLine> | null;
    if (!o || typeof o.serviceId !== "string") return [];
    return [{ serviceId: o.serviceId, quantityEn: String(o.quantityEn ?? ""), quantityAr: String(o.quantityAr ?? ""), ...(o.shortEn ? { shortEn: String(o.shortEn) } : {}), ...(o.shortAr ? { shortAr: String(o.shortAr) } : {}) }];
  });

export const asBullets = (raw: unknown): Bullet[] =>
  (Array.isArray(raw) ? raw : []).flatMap((b) => {
    const o = b as Partial<Bullet> | null;
    const en = String(o?.en ?? "").trim(), ar = String(o?.ar ?? "").trim();
    return en || ar ? [{ en, ar }] : [];
  });

type Row = Awaited<ReturnType<typeof prisma.maintenancePackage.findMany>>[number];
export const toPkg = (r: Row): Pkg => ({
  id: r.id, nameEn: r.nameEn, nameAr: r.nameAr, descriptionEn: r.descriptionEn, descriptionAr: r.descriptionAr, suitableEn: r.suitableEn, suitableAr: r.suitableAr,
  price: r.price, pricePrefixEn: r.pricePrefixEn, pricePrefixAr: r.pricePrefixAr, priceTextEn: r.priceTextEn, priceTextAr: r.priceTextAr,
  maxAcUnits: r.maxAcUnits, badgeEn: r.badgeEn, badgeAr: r.badgeAr, highlighted: r.highlighted, bullets: asBullets(r.bullets), lines: asLines(r.lines),
});

export type GroupInfo = PkgSettings & { id: string | null; key: string; nameEn: string; nameAr: string; ctaMode: CtaMode };

export async function loadGroups(): Promise<GroupInfo[]> {
  const rows = await prisma.maintenanceGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((g) => ({ id: g.id, key: g.key, nameEn: g.nameEn, nameAr: g.nameAr, headingEn: g.headingEn, headingAr: g.headingAr, subtitleEn: g.subtitleEn, subtitleAr: g.subtitleAr, noteEn: g.noteEn, noteAr: g.noteAr, termsEn: g.termsEn, termsAr: g.termsAr, ctaMode: g.ctaMode === "quote" ? "quote" : "subscribe" }));
}

export async function loadServices(groupId: string | null | undefined = undefined): Promise<PkgService[]> {
  const rows = await prisma.maintenanceService.findMany({ where: groupId === undefined ? {} : { groupId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((s) => ({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, ...({ groupId: s.groupId } as object) })) as PkgService[];
}

// The original home packages keep their texts in the single "settings" row; every other group has its own.
export async function loadSettings(): Promise<PkgSettings> {
  const s = await prisma.maintenanceSettings.findUnique({ where: { id: "default" } });
  return s ? { headingEn: s.headingEn, headingAr: s.headingAr, subtitleEn: s.subtitleEn, subtitleAr: s.subtitleAr, noteEn: s.noteEn, noteAr: s.noteAr, termsEn: s.termsEn, termsAr: s.termsAr } : EMPTY_SETTINGS;
}

// What the website shows for one group (an empty key = the original home packages): only active packages, in order, and only
// services that still exist. Prices and quantities are read from here every time, so an admin's change is live as soon as the
// website refreshes its copy.
export async function loadPublicPackages(groupKey = "") {
  let groupId: string | null = null;
  let settings: PkgSettings;
  let ctaMode: CtaMode = "subscribe";
  if (groupKey) {
    const g = await prisma.maintenanceGroup.findUnique({ where: { key: groupKey } });
    if (!g) return { key: groupKey, ctaMode, settings: null, services: [], packages: [], comparison: [], terms: { en: [], ar: [] } };
    groupId = g.id;
    ctaMode = g.ctaMode === "quote" ? "quote" : "subscribe";
    settings = { headingEn: g.headingEn, headingAr: g.headingAr, subtitleEn: g.subtitleEn, subtitleAr: g.subtitleAr, noteEn: g.noteEn, noteAr: g.noteAr, termsEn: g.termsEn, termsAr: g.termsAr };
  } else {
    settings = await loadSettings();
  }
  const [rows, services] = await Promise.all([
    prisma.maintenancePackage.findMany({ where: { active: true, groupId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    loadServices(groupId),
  ]);
  const known = new Set(services.map((s) => s.id));
  const packages = rows.map(toPkg).map((p) => ({ ...p, lines: p.lines.filter((l) => known.has(l.serviceId)) }));
  // The table and the numbered terms are worked out here, once, so the website only has to draw them.
  return { key: groupKey, ctaMode, settings, services, packages, comparison: buildComparison(packages, services), terms: { en: termsList(settings.termsEn), ar: termsList(settings.termsAr) } };
}
