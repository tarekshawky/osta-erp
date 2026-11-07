"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { revalidateSite } from "@/lib/cms/publish";
import { asBullets, asLines, loadServices } from "@/lib/maintenance/data";
import { STANDARD_OPTIONS, seedSet } from "@/lib/maintenance/seeds";
import { parseBuilder, type BuilderConfig } from "@/lib/maintenance/builder";
import { SUBSCRIPTION_STATUSES, packageProblem, serviceProblem, type Bullet, type PkgLine, type PkgSettings } from "@/lib/maintenance/packages";

export type MResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): MResult => ({ ok: false, error });
const refresh = () => {
  revalidatePath("/admin/website/maintenance-packages");
  void revalidateSite([]);
};

// groupId null = the original home packages.
export type PackageInput = {
  groupId: string | null;
  nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string; suitableEn: string; suitableAr: string;
  price: number | null; pricePrefixEn: string; pricePrefixAr: string; priceTextEn: string; priceTextAr: string;
  maxAcUnits: number | null; badgeEn: string; badgeAr: string; highlighted: boolean; active: boolean; bullets: Bullet[]; lines: PkgLine[];
};

const nextOrder = async (model: "maintenancePackage" | "maintenanceService" | "maintenanceGroup") => {
  const last = await (prisma[model] as typeof prisma.maintenancePackage).findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  return (last?.sortOrder ?? 0) + 1;
};

// One highlighted ("recommended") package at a time within a group.
async function clearHighlight(groupId: string | null, exceptId: string | null) {
  await prisma.maintenancePackage.updateMany({ where: { groupId, highlighted: true, ...(exceptId ? { id: { not: exceptId } } : {}) }, data: { highlighted: false } });
}

export async function savePackage(id: string | null, input: PackageInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const groupId = input.groupId || null;
  if (groupId && !(await prisma.maintenanceGroup.findUnique({ where: { id: groupId }, select: { id: true } }))) return fail("This group no longer exists.");
  const services = await loadServices(groupId);
  const lines = input.lines.map((l) => ({ serviceId: l.serviceId, quantityEn: l.quantityEn.trim(), quantityAr: l.quantityAr.trim(), ...(l.shortEn?.trim() ? { shortEn: l.shortEn.trim() } : {}), ...(l.shortAr?.trim() ? { shortAr: l.shortAr.trim() } : {}), ...(typeof l.limit === "number" && Number.isFinite(l.limit) ? { limit: l.limit } : {}) }));
  const bullets = asBullets(input.bullets);
  const problem = packageProblem({ ...input, lines, bullets }, new Set(services.map((s) => s.id)));
  if (problem) return fail(problem);
  const data = {
    groupId, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), descriptionEn: input.descriptionEn.trim(), descriptionAr: input.descriptionAr.trim(),
    suitableEn: input.suitableEn.trim(), suitableAr: input.suitableAr.trim(), price: input.price, pricePrefixEn: input.pricePrefixEn.trim(), pricePrefixAr: input.pricePrefixAr.trim(),
    priceTextEn: input.priceTextEn.trim(), priceTextAr: input.priceTextAr.trim(), maxAcUnits: input.maxAcUnits, badgeEn: input.badgeEn.trim(), badgeAr: input.badgeAr.trim(),
    highlighted: input.highlighted, active: input.active, bullets: bullets as never, lines: lines as never,
  };
  let savedId = id;
  if (id) {
    const before = await prisma.maintenancePackage.findUnique({ where: { id }, select: { nameEn: true, price: true, active: true, groupId: true } });
    if (!before) return fail("This package no longer exists.");
    // A package stays in its group (its included services belong to that group).
    await prisma.maintenancePackage.update({ where: { id }, data: { ...data, groupId: before.groupId } });
    await writeAudit(g.admin, "maintenance.package.update", "MaintenancePackage", id, before, { nameEn: data.nameEn, price: data.price, active: data.active });
  } else {
    const row = await prisma.maintenancePackage.create({ data: { ...data, sortOrder: await nextOrder("maintenancePackage") } });
    savedId = row.id;
    await writeAudit(g.admin, "maintenance.package.create", "MaintenancePackage", row.id, null, { nameEn: data.nameEn, price: data.price });
  }
  if (data.highlighted) await clearHighlight(groupId, savedId);
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
  const row = await prisma.maintenancePackage.create({ data: { ...rest, bullets: asBullets(src.bullets) as never, lines: asLines(src.lines) as never, nameEn: `${src.nameEn} (copy)`, nameAr: `${src.nameAr} (نسخة)`, active: false, highlighted: false, sortOrder: await nextOrder("maintenancePackage") } });
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
  // Past requests keep their copy of the package name and price; they just stop pointing at the package.
  await prisma.maintenancePackage.delete({ where: { id } });
  await writeAudit(g.admin, "maintenance.package.delete", "MaintenancePackage", id, { nameEn: pkg.nameEn, requests: pkg._count.subscriptions }, null);
  refresh();
  return { ok: true };
}

async function swapOrder(model: "maintenancePackage" | "maintenanceService", where: object, id: string, direction: -1 | 1) {
  const all = await (prisma[model] as typeof prisma.maintenancePackage).findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = all.findIndex((p) => p.id === id), j = i + direction;
  if (i < 0 || j < 0 || j >= all.length) return;
  const order = all.map((p) => p.id);
  [order[i], order[j]] = [order[j], order[i]];
  await prisma.$transaction(order.map((x, n) => (prisma[model] as typeof prisma.maintenancePackage).update({ where: { id: x }, data: { sortOrder: n + 1 } })));
}

export async function movePackage(id: string, direction: -1 | 1): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const row = await prisma.maintenancePackage.findUnique({ where: { id }, select: { groupId: true } });
  if (row) await swapOrder("maintenancePackage", { groupId: row.groupId }, id, direction);
  refresh();
  return { ok: true };
}

// ---- services ----
export type ServiceInput = { groupId: string | null; nameEn: string; nameAr: string; showInComparison: boolean; metric: "" | "handyman_hours" | "visits" };

export async function saveService(id: string | null, input: ServiceInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const problem = serviceProblem(input.nameEn, input.nameAr);
  if (problem) return fail(problem);
  const names = { nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), showInComparison: input.showInComparison, metric: input.metric === "handyman_hours" || input.metric === "visits" ? input.metric : "" };
  if (id) {
    if (!(await prisma.maintenanceService.findUnique({ where: { id }, select: { id: true } }))) return fail("This service no longer exists.");
    await prisma.maintenanceService.update({ where: { id }, data: names });
  } else {
    await prisma.maintenanceService.create({ data: { ...names, groupId: input.groupId || null, sortOrder: await nextOrder("maintenanceService") } });
  }
  await writeAudit(g.admin, id ? "maintenance.service.update" : "maintenance.service.create", "MaintenanceService", id, null, names);
  refresh();
  return { ok: true };
}

export async function deleteService(id: string): Promise<MResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const svc = await prisma.maintenanceService.findUnique({ where: { id } });
  if (!svc) return fail("This service no longer exists.");
  const packages = await prisma.maintenancePackage.findMany({ where: { groupId: svc.groupId }, select: { id: true, lines: true } });
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
  const row = await prisma.maintenanceService.findUnique({ where: { id }, select: { groupId: true } });
  if (row) await swapOrder("maintenanceService", { groupId: row.groupId }, id, direction);
  refresh();
  return { ok: true };
}

// ---- groups ----
export type GroupInput = { key: string; nameEn: string; nameAr: string; ctaMode: "subscribe" | "quote" };

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A group is one set of packages for one page. Its key is what the page block uses to pick it.
export async function saveGroup(id: string | null, input: GroupInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const key = input.key.trim().toLowerCase();
  if (!KEY.test(key) || key.length > 40) return fail("The key can use lowercase letters, numbers and dashes (for example commercial-maintenance).");
  if (!input.nameEn.trim() || !input.nameAr.trim()) return fail("Give the group a name in English and in Arabic.");
  if (input.ctaMode !== "subscribe" && input.ctaMode !== "quote") return fail("Choose Subscribe Now or Request a Quote.");
  const clash = await prisma.maintenanceGroup.findUnique({ where: { key } });
  if (clash && clash.id !== id) return fail("Another group already uses this key.");
  const data = { key, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), ctaMode: input.ctaMode };
  const row = id ? await prisma.maintenanceGroup.update({ where: { id }, data }) : await prisma.maintenanceGroup.create({ data: { ...data, sortOrder: await nextOrder("maintenanceGroup") } });
  await writeAudit(g.admin, id ? "maintenance.group.update" : "maintenance.group.create", "MaintenanceGroup", row.id, null, data);
  refresh();
  return { ok: true, id: row.id };
}

export async function deleteGroup(id: string): Promise<MResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const group = await prisma.maintenanceGroup.findUnique({ where: { id }, select: { nameEn: true } });
  if (!group) return fail("This group no longer exists.");
  const packages = await prisma.maintenancePackage.count({ where: { groupId: id } });
  if (packages > 0) return fail(`This group still has ${packages} package${packages > 1 ? "s" : ""}. Delete them first.`);
  await prisma.$transaction([prisma.maintenanceService.deleteMany({ where: { groupId: id } }), prisma.maintenanceGroup.delete({ where: { id } })]);
  await writeAudit(g.admin, "maintenance.group.delete", "MaintenanceGroup", id, { nameEn: group.nameEn }, null);
  refresh();
  return { ok: true };
}

// ---- texts and terms ---- (groupId null = the original home packages)
export async function saveSettings(groupId: string | null, input: PkgSettings): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const keys = Object.keys(input) as (keyof PkgSettings)[];
  if (keys.some((k) => typeof input[k] !== "string" || input[k].length > 20_000)) return fail("A text is too long.");
  if (groupId) {
    if (!(await prisma.maintenanceGroup.findUnique({ where: { id: groupId }, select: { id: true } }))) return fail("This group no longer exists.");
    await prisma.maintenanceGroup.update({ where: { id: groupId }, data: input });
  } else {
    await prisma.maintenanceSettings.upsert({ where: { id: "default" }, update: input, create: { id: "default", ...input } });
  }
  await writeAudit(g.admin, "maintenance.settings.save", groupId ? "MaintenanceGroup" : "MaintenanceSettings", groupId ?? "default", null, { termsChars: input.termsEn.length + input.termsAr.length });
  refresh();
  return { ok: true };
}

// "Load a ready-made set": only when that set's place is empty, so nothing an admin already made can be overwritten.
export async function loadReadySet(setKey: string): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const set = seedSet(setKey);
  if (!set) return fail("Unknown set.");
  let groupId: string | null = null;
  if (set.group) {
    if (await prisma.maintenanceGroup.findUnique({ where: { key: set.group.key } })) return fail("This set was already loaded. Edit it, or delete its group first.");
  } else if ((await prisma.maintenancePackage.count({ where: { groupId: null } })) + (await prisma.maintenanceService.count({ where: { groupId: null } })) > 0) {
    return fail("The home packages already exist. A ready-made set is only loaded into an empty place.");
  }
  const ids = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    if (set.group) groupId = (await tx.maintenanceGroup.create({ data: { ...set.group, ...set.settings, sortOrder: (await tx.maintenanceGroup.count()) + 1 } })).id;
    let n = 0;
    for (const s of set.services) ids.set(s.key, (await tx.maintenanceService.create({ data: { groupId, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, metric: s.metric ?? "", sortOrder: ++n } })).id);
    n = 0;
    for (const p of set.packages) {
      await tx.maintenancePackage.create({
        data: {
          groupId, nameEn: p.nameEn, nameAr: p.nameAr, suitableEn: p.suitableEn, suitableAr: p.suitableAr, price: p.price, pricePrefixEn: p.pricePrefixEn ?? "", pricePrefixAr: p.pricePrefixAr ?? "",
          priceTextEn: p.priceTextEn ?? "", priceTextAr: p.priceTextAr ?? "", maxAcUnits: p.maxAcUnits, badgeEn: p.badgeEn, badgeAr: p.badgeAr, highlighted: p.highlighted, sortOrder: ++n,
          bullets: p.bullets as never,
          lines: p.lines.map((l) => ({ serviceId: ids.get(l.service)!, quantityEn: l.en, quantityAr: l.ar, ...(l.shortEn ? { shortEn: l.shortEn } : {}), ...(l.shortAr ? { shortAr: l.shortAr } : {}), ...(l.limit != null ? { limit: l.limit } : {}) })) as never,
        },
      });
    }
    if (!set.group) await tx.maintenanceSettings.upsert({ where: { id: "default" }, update: set.settings, create: { id: "default", ...set.settings } });
  });
  await writeAudit(g.admin, "maintenance.load-set", "MaintenancePackage", null, null, { set: setKey, packages: set.packages.length, services: set.services.length });
  refresh();
  return { ok: true };
}

// ---- subscription / quote requests ----
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

// ---- Smart Package Builder ----
export async function saveBuilder(groupId: string | null, input: BuilderConfig): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  // The stored config is always the repaired one, so a bad value can never reach the website.
  const config = parseBuilder(input);
  if (groupId) {
    if (!(await prisma.maintenanceGroup.findUnique({ where: { id: groupId }, select: { id: true } }))) return fail("This group no longer exists.");
    await prisma.maintenanceGroup.update({ where: { id: groupId }, data: { builder: config as never } });
  } else {
    await prisma.maintenanceSettings.upsert({ where: { id: "default" }, update: { builder: config as never }, create: { id: "default", builder: config as never } });
  }
  await writeAudit(g.admin, "maintenance.builder.save", groupId ? "MaintenanceGroup" : "MaintenanceSettings", groupId ?? "default", null, { enabled: config.enabled, calculator: config.calculator });
  refresh();
  return { ok: true };
}

export type OptionInput = { groupId: string | null; category: string; nameEn: string; nameAr: string; serviceId: string | null; extraPrice: number | null; upgradeTrigger: boolean; active: boolean };

export async function saveOption(id: string | null, input: OptionInput): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const problem = serviceProblem(input.nameEn, input.nameAr);
  if (problem) return fail(problem);
  if (input.extraPrice != null && (!Number.isFinite(input.extraPrice) || input.extraPrice < 0 || input.extraPrice > 1_000_000)) return fail("The extra price must be 0 or more (leave it empty for a quotation).");
  const groupId = input.groupId || null;
  if (input.serviceId && !(await prisma.maintenanceService.findFirst({ where: { id: input.serviceId, groupId }, select: { id: true } }))) return fail("The linked service does not belong to this group.");
  const data = { category: input.category.trim().slice(0, 40) || "general", nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), serviceId: input.serviceId || null, extraPrice: input.extraPrice, upgradeTrigger: input.upgradeTrigger, active: input.active };
  if (id) {
    if (!(await prisma.maintenanceOption.findUnique({ where: { id }, select: { id: true } }))) return fail("This option no longer exists.");
    await prisma.maintenanceOption.update({ where: { id }, data });
  } else {
    const last = await prisma.maintenanceOption.findFirst({ where: { groupId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    await prisma.maintenanceOption.create({ data: { ...data, groupId, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  }
  await writeAudit(g.admin, id ? "maintenance.option.update" : "maintenance.option.create", "MaintenanceOption", id, null, { nameEn: data.nameEn, extraPrice: data.extraPrice });
  refresh();
  return { ok: true };
}

export async function deleteOption(id: string): Promise<MResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const o = await prisma.maintenanceOption.findUnique({ where: { id }, select: { nameEn: true } });
  if (!o) return fail("This option no longer exists.");
  await prisma.maintenanceOption.delete({ where: { id } });
  await writeAudit(g.admin, "maintenance.option.delete", "MaintenanceOption", id, { nameEn: o.nameEn }, null);
  refresh();
  return { ok: true };
}

// The standard list of requirements (AC, plumbing, electrical, handyman), each linked to the package service it belongs to by name.
// Only into a group that has no options yet; anything not matching a service is created unlinked (an extra / quotation).
export async function loadStandardOptions(groupId: string | null): Promise<MResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  if ((await prisma.maintenanceOption.count({ where: { groupId } })) > 0) return fail("This group already has options. The standard list is only loaded into an empty one.");
  const services = await prisma.maintenanceService.findMany({ where: { groupId }, select: { id: true, nameEn: true } });
  const idOf = (name?: string) => services.find((s) => s.nameEn === name)?.id ?? null;
  await prisma.maintenanceOption.createMany({ data: STANDARD_OPTIONS.map((o, i) => ({ groupId, category: o.category, nameEn: o.nameEn, nameAr: o.nameAr, serviceId: idOf(o.service), sortOrder: i + 1 })) });
  await writeAudit(g.admin, "maintenance.options.load-standard", "MaintenanceOption", null, null, { count: STANDARD_OPTIONS.length });
  refresh();
  return { ok: true };
}
