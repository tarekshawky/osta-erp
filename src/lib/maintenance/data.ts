import { prisma } from "@/lib/prisma";
import { buildComparison, termsList, type Pkg, type PkgLine, type PkgService, type PkgSettings } from "./packages";

const EMPTY_SETTINGS: PkgSettings = { headingEn: "", headingAr: "", subtitleEn: "", subtitleAr: "", noteEn: "", noteAr: "", termsEn: "", termsAr: "" };

export const asLines = (raw: unknown): PkgLine[] =>
  (Array.isArray(raw) ? raw : []).flatMap((l) => {
    const o = l as Partial<PkgLine> | null;
    if (!o || typeof o.serviceId !== "string") return [];
    return [{ serviceId: o.serviceId, quantityEn: String(o.quantityEn ?? ""), quantityAr: String(o.quantityAr ?? ""), ...(o.shortEn ? { shortEn: String(o.shortEn) } : {}), ...(o.shortAr ? { shortAr: String(o.shortAr) } : {}) }];
  });

type Row = Awaited<ReturnType<typeof prisma.maintenancePackage.findMany>>[number];
export const toPkg = (r: Row): Pkg => ({
  id: r.id, nameEn: r.nameEn, nameAr: r.nameAr, descriptionEn: r.descriptionEn, descriptionAr: r.descriptionAr, suitableEn: r.suitableEn, suitableAr: r.suitableAr,
  price: r.price, maxAcUnits: r.maxAcUnits, badgeEn: r.badgeEn, badgeAr: r.badgeAr, highlighted: r.highlighted, lines: asLines(r.lines),
});

export async function loadServices(): Promise<PkgService[]> {
  const rows = await prisma.maintenanceService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((s) => ({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison }));
}

export async function loadSettings(): Promise<PkgSettings> {
  const s = await prisma.maintenanceSettings.findUnique({ where: { id: "default" } });
  return s ? { headingEn: s.headingEn, headingAr: s.headingAr, subtitleEn: s.subtitleEn, subtitleAr: s.subtitleAr, noteEn: s.noteEn, noteAr: s.noteAr, termsEn: s.termsEn, termsAr: s.termsAr } : EMPTY_SETTINGS;
}

// What the website shows: only active packages, in order, and only services that still exist. Prices and quantities are read
// from here every time, so an admin's change is live as soon as the website refreshes its copy.
export async function loadPublicPackages() {
  const [rows, services, settings] = await Promise.all([
    prisma.maintenancePackage.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    loadServices(),
    loadSettings(),
  ]);
  const known = new Set(services.map((s) => s.id));
  const packages = rows.map(toPkg).map((p) => ({ ...p, lines: p.lines.filter((l) => known.has(l.serviceId)) }));
  // The table and the numbered terms are worked out here, once, so the website only has to draw them.
  return { settings, services, packages, comparison: buildComparison(packages, services), terms: { en: termsList(settings.termsEn), ar: termsList(settings.termsAr) } };
}
