"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { asLines, loadServices } from "@/lib/maintenance/data";
import {
  STANDARD_PACKAGES, STANDARD_SERVICES, STANDARD_SETTINGS, SUBSCRIPTION_STATUSES, packageProblem, serviceProblem,
  type PkgLine, type PkgSettings,
} from "@/lib/maintenance/packages";

export type MResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): MResult => ({ ok: false, error });
const refresh = () => {
  revalidatePath("/admin/website/maintenance-packages");
  void revalidateSite([]);
};

export type PackageInput = {
  nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string; suitableEn: string; suitableAr: string;
  price: number; maxAcUnits: number | null; badgeEn: string; badgeAr: string; highlighted: boolean; active: boolean; lines: PkgLine[];
};

const nextOrder = async (model: "maintenancePackage" | "maintenanceService") => {
  const last = await (prisma[model] as typeof prisma.maintenancePackage).findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  return (last?.sortOrder ?? 0) + 1;
};

// One highlighted ("recommended") package at a time.
async function clearHighlight(exceptId: string | null) {
  await prisma.maintenancePackage.updateMany({ where: { highlighted: true, ...(exceptId ? { id: { not: exceptId } } : {}) }, data: { highlighted: false } });
}

export async function savePackage(id: string | null, input: PackageInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const services = await loadServices();
  const lines = input.lines.map((l) => ({ serviceId: l.serviceId, quantityEn: l.quantityEn.trim(), quantityAr: l.quantityAr.trim(), ...(l.shortEn?.trim() ? { shortEn: l.shortEn.trim() } : {}), ...(l.shortAr?.trim() ? { shortAr: l.shortAr.trim() } : {}) }));
  const problem = packageProblem({ ...input, lines }, new Set(services.map((s) => s.id)));
  if (problem) return fail(problem);
  const data = {
    nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), descriptionEn: input.descriptionEn.trim(), descriptionAr: input.descriptionAr.trim(),
    suitableEn: input.suitableEn.trim(), suitableAr: input.suitableAr.trim(), price: input.price, maxAcUnits: input.maxAcUnits,
    badgeEn: input.badgeEn.trim(), badgeAr: input.badgeAr.trim(), highlighted: input.highlighted, active: input.active, lines: lines as never,
  };
  let savedId = id;
  if (id) {
    const before = await prisma.maintenancePackage.findUnique({ where: { id }, select: { nameEn: true, price: true, active: true } });
    if (!before) return fail("This package no longer exists.");
    await prisma.maintenancePackage.update({ where: { id }, data });
    await writeAudit(g.admin, "maintenance.package.update", "MaintenancePackage", id, before, { nameEn: data.nameEn, price: data.price, active: data.active });
  } else {
    const row = await prisma.maintenancePackage.create({ data: { ...data, sortOrder: await nextOrder("maintenancePackage") } });
    savedId = row.id;
    await writeAudit(g.admin, "maintenance.package.create", "MaintenancePackage", row.id, null, { nameEn: data.nameEn, price: data.price });
  }
  if (data.highlighted) await clearHighlight(savedId);
  refresh();
  return { ok: true, id: savedId ?? undefined };
}

export async function duplicatePackage(id: string): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const src = await prisma.maintenancePackage.findUnique({ where: { id } });
  if (!src) return fail("This package no longer exists.");
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  void _id; void _c; void _u;
  // The copy starts switched off and not recommended, so it cannot appear on the website by accident.
  const row = await prisma.maintenancePackage.create({ data: { ...rest, lines: asLines(src.lines) as never, nameEn: `${src.nameEn} (copy)`, nameAr: `${src.nameAr} (نسخة)`, active: false, highlighted: false, sortOrder: await nextOrder("maintenancePackage") } });
  await writeAudit(g.admin, "maintenance.package.duplicate", "MaintenancePackage", row.id, { from: id }, { nameEn: row.nameEn });
  refresh();
  return { ok: true, id: row.id };
}

export async function setPackageActive(id: string, active: boolean): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  await prisma.maintenancePackage.update({ where: { id }, data: { active } });
  await writeAudit(g.admin, active ? "maintenance.package.activate" : "maintenance.package.deactivate", "MaintenancePackage", id, null, { active });
  refresh();
  return { ok: true };
}

export async function deletePackage(id: string): Promise<MResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const pkg = await prisma.maintenancePackage.findUnique({ where: { id }, select: { nameEn: true, _count: { select: { subscriptions: true } } } });
  if (!pkg) return fail("This package no longer exists.");
  // Past subscription requests keep their copy of the package name and price; they just stop pointing at the package.
  await prisma.maintenancePackage.delete({ where: { id } });
  await writeAudit(g.admin, "maintenance.package.delete", "MaintenancePackage", id, { nameEn: pkg.nameEn, requests: pkg._count.subscriptions }, null);
  refresh();
  return { ok: true };
}

export async function movePackage(id: string, direction: -1 | 1): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const all = await prisma.maintenancePackage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = all.findIndex((p) => p.id === id), j = i + direction;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  const order = all.map((p) => p.id);
  [order[i], order[j]] = [order[j], order[i]];
  await prisma.$transaction(order.map((pid, n) => prisma.maintenancePackage.update({ where: { id: pid }, data: { sortOrder: n + 1 } })));
  refresh();
  return { ok: true };
}

// ---- services ----
export type ServiceInput = { nameEn: string; nameAr: string; showInComparison: boolean };

export async function saveService(id: string | null, input: ServiceInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const problem = serviceProblem(input.nameEn, input.nameAr);
  if (problem) return fail(problem);
  const data = { nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), showInComparison: input.showInComparison };
  if (id) {
    if (!(await prisma.maintenanceService.findUnique({ where: { id }, select: { id: true } }))) return fail("This service no longer exists.");
    await prisma.maintenanceService.update({ where: { id }, data });
  } else {
    await prisma.maintenanceService.create({ data: { ...data, sortOrder: await nextOrder("maintenanceService") } });
  }
  await writeAudit(g.admin, id ? "maintenance.service.update" : "maintenance.service.create", "MaintenanceService", id, null, data);
  refresh();
  return { ok: true };
}

export async function deleteService(id: string): Promise<MResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const svc = await prisma.maintenanceService.findUnique({ where: { id } });
  if (!svc) return fail("This service no longer exists.");
  const packages = await prisma.maintenancePackage.findMany({ select: { id: true, lines: true } });
  await prisma.$transaction([
    ...packages
      .filter((p) => asLines(p.lines).some((l) => l.serviceId === id))
      .map((p) => prisma.maintenancePackage.update({ where: { id: p.id }, data: { lines: asLines(p.lines).filter((l) => l.serviceId !== id) as never } })),
    prisma.maintenanceService.delete({ where: { id } }),
  ]);
  await writeAudit(g.admin, "maintenance.service.delete", "MaintenanceService", id, { nameEn: svc.nameEn }, null);
  refresh();
  return { ok: true };
}

export async function moveService(id: string, direction: -1 | 1): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const all = await prisma.maintenanceService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = all.findIndex((s) => s.id === id), j = i + direction;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  const order = all.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  await prisma.$transaction(order.map((sid, n) => prisma.maintenanceService.update({ where: { id: sid }, data: { sortOrder: n + 1 } })));
  refresh();
  return { ok: true };
}

// ---- texts and terms ----
export async function saveSettings(input: PkgSettings): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const keys = Object.keys(input) as (keyof PkgSettings)[];
  if (keys.some((k) => typeof input[k] !== "string" || input[k].length > 20_000)) return fail("A text is too long.");
  await prisma.maintenanceSettings.upsert({ where: { id: "default" }, update: input, create: { id: "default", ...input } });
  await writeAudit(g.admin, "maintenance.settings.save", "MaintenanceSettings", "default", null, { termsChars: input.termsEn.length + input.termsAr.length });
  refresh();
  return { ok: true };
}

// "Load the standard packages": only into an empty setup, so nothing the admin already made can be overwritten.
export async function loadStandardPackages(): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const [packages, services] = await Promise.all([prisma.maintenancePackage.count(), prisma.maintenanceService.count()]);
  if (packages > 0 || services > 0) return fail("There are already packages or services. The standard ones are only loaded into an empty setup.");
  const ids = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    let n = 0;
    for (const s of STANDARD_SERVICES) {
      const row = await tx.maintenanceService.create({ data: { nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, sortOrder: ++n } });
      ids.set(s.key, row.id);
    }
    n = 0;
    for (const p of STANDARD_PACKAGES) {
      await tx.maintenancePackage.create({
        data: {
          nameEn: p.nameEn, nameAr: p.nameAr, suitableEn: p.suitableEn, suitableAr: p.suitableAr, price: p.price, maxAcUnits: p.maxAcUnits, badgeEn: p.badgeEn, badgeAr: p.badgeAr,
          highlighted: p.highlighted, sortOrder: ++n,
          lines: p.lines.map((l) => ({ serviceId: ids.get(l.service)!, quantityEn: l.en, quantityAr: l.ar, ...(l.shortEn ? { shortEn: l.shortEn } : {}), ...(l.shortAr ? { shortAr: l.shortAr } : {}) })) as never,
        },
      });
    }
    await tx.maintenanceSettings.upsert({ where: { id: "default" }, update: STANDARD_SETTINGS, create: { id: "default", ...STANDARD_SETTINGS } });
  });
  await writeAudit(g.admin, "maintenance.load-standard", "MaintenancePackage", null, null, { packages: STANDARD_PACKAGES.length, services: STANDARD_SERVICES.length });
  refresh();
  return { ok: true };
}

// ---- subscription requests ----
export async function updateSubscription(id: string, status: string, notes: string): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) return fail("Choose a valid status.");
  if (notes.length > 2000) return fail("Notes can be up to 2000 characters.");
  const before = await prisma.maintenanceSubscription.findUnique({ where: { id }, select: { status: true } });
  if (!before) return fail("This request no longer exists.");
  await prisma.maintenanceSubscription.update({ where: { id }, data: { status, notes: notes.trim() } });
  await writeAudit(g.admin, "maintenance.subscription.update", "MaintenanceSubscription", id, before, { status });
  refresh();
  return { ok: true };
}

export async function listSubscriptions() {
  await requireEmployee("ADMIN");
  return prisma.maintenanceSubscription.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
}
