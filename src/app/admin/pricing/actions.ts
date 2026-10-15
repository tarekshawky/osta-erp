"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { SERVICE_NOTE_MAX } from "@/lib/pricing/serviceNote";
import { aedToFils } from "@/lib/pricing/money";
import { validateTiers } from "@/lib/pricing/priceQuote";

export type ActionResult = { ok: boolean; error?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

async function log(entity: string, entityId: string, before: unknown, after: unknown, changedById: string) {
  const actor = await prisma.employee.findUnique({ where: { id: changedById }, select: { id: true, name: true } });
  if (actor) await writeAudit(actor, `pricing.${entity}`, entity, entityId, before, after);
  await prisma.priceChangeLog.create({
    data: {
      entity,
      entityId,
      before: before === null || before === undefined ? undefined : (before as object),
      after: after === null || after === undefined ? undefined : (after as object),
      changedById,
    },
  });
}

function done(): ActionResult {
  revalidatePath("/admin/pricing", "layout");
  return { ok: true };
}

// ---------- Services & prices ----------

// priceAed "" = not available in this emirate (the row is deactivated, never deleted, so history stays).
export async function setServicePrice(serviceId: string, regionId: string, priceAed: string): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const existing = await prisma.servicePrice.findUnique({ where: { serviceId_regionId: { serviceId, regionId } } });

  if (priceAed.trim() === "") {
    if (existing?.active) {
      await prisma.servicePrice.update({ where: { id: existing.id }, data: { active: false } });
      await log("ServicePrice", existing.id, { unitPriceFils: existing.unitPriceFils, active: true }, { active: false }, admin.id);
    }
    return done();
  }

  const fils = aedToFils(priceAed);
  if (fils === null || fils <= 0) return fail("Enter a valid price in AED (up to 2 decimals).");
  if (fils > 100_000_000) return fail("Price is too large.");

  const saved = await prisma.servicePrice.upsert({
    where: { serviceId_regionId: { serviceId, regionId } },
    update: { unitPriceFils: fils, active: true },
    create: { serviceId, regionId, unitPriceFils: fils },
  });
  await log(
    "ServicePrice",
    saved.id,
    existing ? { unitPriceFils: existing.unitPriceFils, active: existing.active } : null,
    { unitPriceFils: fils, active: true },
    admin.id
  );
  return done();
}

export type ServiceInput = {
  nameEn: string;
  nameAr: string;
  pricingUnit: string;
  minQuantity: string;
  active: boolean;
  discountRuleSetId: string;
  pricesIncludeVat: "" | "true" | "false";
  // Optional note shown to customers next to the service (what the price does or does not include).
  noteEn: string;
  noteAr: string;
};


const UNITS = ["AC_UNIT", "UNIT", "ROOM", "AREA_SQM", "VISIT", "FIXED"];

function validateService(i: ServiceInput): string | null {
  if (!i.nameEn.trim() || !i.nameAr.trim()) return "Both English and Arabic names are required.";
  if (!UNITS.includes(i.pricingUnit)) return "Invalid pricing unit.";
  const min = Number(i.minQuantity);
  if (!Number.isInteger(min) || min < 1) return "Minimum quantity must be a whole number of 1 or more.";
  if (i.noteEn.length > SERVICE_NOTE_MAX || i.noteAr.length > SERVICE_NOTE_MAX) return `The note can be up to ${SERVICE_NOTE_MAX} characters in each language.`;
  return null;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function saveService(id: string | null, input: ServiceInput): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const error = validateService(input);
  if (error) return fail(error);

  const data = {
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    pricingUnit: input.pricingUnit,
    minQuantity: Number(input.minQuantity),
    active: input.active,
    discountRuleSetId: input.discountRuleSetId || null,
    pricesIncludeVat: input.pricesIncludeVat === "" ? null : input.pricesIncludeVat === "true",
    noteEn: input.noteEn.trim(),
    noteAr: input.noteAr.trim(),
  };

  if (id) {
    const before = await prisma.bookableService.findUnique({ where: { id } });
    if (!before) return fail("Service not found.");
    await prisma.bookableService.update({ where: { id }, data });
    await log("BookableService", id, before, data, admin.id);
  } else {
    const base = slugify(data.nameEn) || "service";
    let slug = base;
    for (let n = 2; await prisma.bookableService.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    const created = await prisma.bookableService.create({ data: { ...data, slug } });
    await log("BookableService", created.id, null, data, admin.id);
  }
  return done();
}

// ---------- Discount rule sets ----------

export type TierInput = { minQty: string; maxQty: string; percent: string };
export type RuleSetInput = { name: string; active: boolean; startsAt: string; endsAt: string; tiers: TierInput[] };

function parseRuleSet(input: RuleSetInput) {
  if (!input.name.trim()) return { ok: false as const, error: "Rule set name is required." };
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if ((startsAt && isNaN(+startsAt)) || (endsAt && isNaN(+endsAt))) return { ok: false as const, error: "Invalid start/end date." };
  if (startsAt && endsAt && endsAt < startsAt) return { ok: false as const, error: "End date is before the start date." };

  const tiers = [];
  for (const t of input.tiers) {
    const minQty = Number(t.minQty);
    const maxQty = t.maxQty.trim() === "" ? null : Number(t.maxQty);
    const percent = Number(t.percent);
    if (!Number.isInteger(minQty) || (maxQty !== null && !Number.isInteger(maxQty)) || t.percent.trim() === "" || isNaN(percent)) {
      return { ok: false as const, error: "Every tier needs whole-number quantities and a percent." };
    }
    tiers.push({ minQty, maxQty, percent });
  }
  const problems = validateTiers(tiers);
  if (problems.length) return { ok: false as const, error: problems[0] };
  return { ok: true as const, startsAt, endsAt, tiers };
}

export async function saveRuleSet(id: string | null, input: RuleSetInput): Promise<ActionResult> {
  const g = await guardPermission("discounts.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const parsed = parseRuleSet(input);
  if (!parsed.ok) return fail(parsed.error);

  const tierRows = parsed.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, percent: t.percent }));
  if (id) {
    const before = await prisma.discountRuleSet.findUnique({ where: { id }, include: { tiers: true } });
    if (!before) return fail("Rule set not found.");
    await prisma.$transaction([
      prisma.discountTier.deleteMany({ where: { ruleSetId: id } }),
      prisma.discountRuleSet.update({
        where: { id },
        data: {
          name: input.name.trim(),
          active: input.active,
          startsAt: parsed.startsAt,
          endsAt: parsed.endsAt,
          tiers: { create: tierRows },
        },
      }),
    ]);
    await log("DiscountTier", id, before.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, percent: t.percent })), tierRows, admin.id);
  } else {
    const created = await prisma.discountRuleSet.create({
      data: {
        name: input.name.trim(),
        active: input.active,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        tiers: { create: tierRows },
      },
    });
    await log("DiscountTier", created.id, null, tierRows, admin.id);
  }
  return done();
}

// ---------- Booking types ----------

export type BookingTypeInput = {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  feeAed: string;
  hoursStart: string;
  hoursEnd: string;
  sameDayAllowed: boolean;
  active: boolean;
};

export async function saveBookingType(id: string, input: BookingTypeInput): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  if (!input.nameEn.trim() || !input.nameAr.trim()) return fail("Both English and Arabic names are required.");
  const fee = input.feeAed.trim() === "" ? 0 : aedToFils(input.feeAed);
  if (fee === null) return fail("Enter a valid fee in AED.");
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((input.hoursStart && !time.test(input.hoursStart)) || (input.hoursEnd && !time.test(input.hoursEnd))) {
    return fail("Hours must be formatted HH:MM.");
  }

  const before = await prisma.bookingType.findUnique({ where: { id } });
  if (!before) return fail("Booking type not found.");
  const data = {
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    descriptionEn: input.descriptionEn.trim() || null,
    descriptionAr: input.descriptionAr.trim() || null,
    defaultFeeFils: fee,
    hoursStart: input.hoursStart || null,
    hoursEnd: input.hoursEnd || null,
    sameDayAllowed: input.sameDayAllowed,
    active: input.active,
  };
  await prisma.bookingType.update({ where: { id }, data });
  await log("BookingType", id, before, data, admin.id);
  return done();
}

export async function addFeeOverride(
  bookingTypeId: string,
  serviceId: string,
  regionId: string,
  feeAed: string
): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  if (!serviceId && !regionId) return fail("Pick a service, an emirate, or both.");
  const fee = aedToFils(feeAed || "");
  if (fee === null) return fail("Enter a valid fee in AED (0 is allowed).");

  const dup = await prisma.bookingTypeFeeOverride.findFirst({
    where: { bookingTypeId, serviceId: serviceId || null, regionId: regionId || null },
  });
  if (dup) return fail("An override for this service/emirate already exists. Delete it first.");

  const created = await prisma.bookingTypeFeeOverride.create({
    data: { bookingTypeId, serviceId: serviceId || null, regionId: regionId || null, feeFils: fee },
  });
  await log("BookingType", bookingTypeId, null, { override: created.id, feeFils: fee, serviceId, regionId }, admin.id);
  return done();
}

export async function deleteFeeOverride(id: string): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const row = await prisma.bookingTypeFeeOverride.findUnique({ where: { id } });
  if (!row) return fail("Override not found.");
  await prisma.bookingTypeFeeOverride.delete({ where: { id } });
  await log("BookingType", row.bookingTypeId, { override: row }, null, admin.id);
  return done();
}

// ---------- Tax & visit fee ----------

export async function saveTax(vatRatePercent: string, pricesIncludeVat: boolean): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const rate = Number(vatRatePercent);
  if (vatRatePercent.trim() === "" || isNaN(rate) || rate < 0 || rate > 100) return fail("VAT rate must be between 0 and 100.");
  const before = await prisma.taxSetting.findUnique({ where: { id: "default" } });
  await prisma.taxSetting.upsert({
    where: { id: "default" },
    update: { vatRatePercent: rate, pricesIncludeVat },
    create: { id: "default", vatRatePercent: rate, pricesIncludeVat },
  });
  await log("TaxSetting", "default", before, { vatRatePercent: rate, pricesIncludeVat }, admin.id);
  return done();
}

export type VisitFeeInput = {
  amountAed: string;
  textAr: string;
  textEn: string;
  consentLabelAr: string;
  consentLabelEn: string;
  reasons: string[];
  requiresAdminReview: boolean;
};

// Policies are immutable: every save inserts the next version; orders keep pointing at the one they accepted.
export async function publishVisitFeePolicy(input: VisitFeeInput): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  const amount = aedToFils(input.amountAed);
  if (amount === null || amount <= 0) return fail("Enter a valid visit-fee amount in AED.");
  if (!input.textAr.trim() || !input.textEn.trim() || !input.consentLabelAr.trim() || !input.consentLabelEn.trim()) {
    return fail("Arabic and English policy text and consent labels are all required.");
  }
  const latest = await prisma.visitFeePolicy.findFirst({ orderBy: { version: "desc" } });
  const created = await prisma.visitFeePolicy.create({
    data: {
      version: (latest?.version ?? 0) + 1,
      amountFils: amount,
      textAr: input.textAr.trim(),
      textEn: input.textEn.trim(),
      consentLabelAr: input.consentLabelAr.trim(),
      consentLabelEn: input.consentLabelEn.trim(),
      reasons: input.reasons,
      requiresAdminReview: input.requiresAdminReview,
      createdById: admin.id,
    },
  });
  await log("VisitFeePolicy", created.id, latest && { version: latest.version, amountFils: latest.amountFils }, { version: created.version, amountFils: amount }, admin.id);
  return done();
}

export async function reviewVisitFeeCharge(id: string, decision: "APPROVED" | "REJECTED", note: string): Promise<ActionResult> {
  const g = await guardPermission("visitFee.review");
  if (!g.ok) return fail(g.error);
  const admin = g.admin;
  if (decision === "REJECTED" && !note.trim()) return fail("A reason is required to reject a charge.");
  const charge = await prisma.visitFeeCharge.findUnique({ where: { id } });
  if (!charge) return fail("Charge not found.");
  if (charge.status !== "PENDING_REVIEW") return fail("This charge was already reviewed.");
  await prisma.visitFeeCharge.update({
    where: { id },
    data: { status: decision, reviewNote: note.trim() || null, reviewedById: admin.id, reviewedAt: new Date() },
  });
  return done();
}

// ---------- Service options (e.g. gas weight: quarter kg / half kg / 1 kg) ----------

export type OptionInput = { nameEn: string; nameAr: string; active: boolean };

export async function saveOption(serviceId: string, id: string | null, input: OptionInput): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  if (!input.nameEn.trim() || !input.nameAr.trim()) return fail("Both English and Arabic names are required.");
  if (input.nameEn.length > 80 || input.nameAr.length > 80) return fail("Option names can be up to 80 characters.");
  const service = await prisma.bookableService.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) return fail("Service not found.");
  const data = { nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), active: input.active };
  if (id) {
    const before = await prisma.serviceOption.findFirst({ where: { id, serviceId } });
    if (!before) return fail("Option not found.");
    await prisma.serviceOption.update({ where: { id }, data });
    await log("ServiceOption", id, { nameEn: before.nameEn, nameAr: before.nameAr, active: before.active }, data, g.admin.id);
  } else {
    const top = (await prisma.serviceOption.aggregate({ where: { serviceId }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    const created = await prisma.serviceOption.create({ data: { ...data, serviceId, sortOrder: top + 1 } });
    await log("ServiceOption", created.id, null, data, g.admin.id);
  }
  return done();
}

export async function moveOption(serviceId: string, id: string, direction: "up" | "down"): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const all = await prisma.serviceOption.findMany({ where: { serviceId }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true } });
  const i = all.findIndex((o) => o.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return done();
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((o, n) => prisma.serviceOption.update({ where: { id: o.id }, data: { sortOrder: n } })));
  return done();
}

// Orders keep a copy of the option's name, so deleting an option never changes past orders.
export async function deleteOption(serviceId: string, id: string): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const before = await prisma.serviceOption.findFirst({ where: { id, serviceId } });
  if (!before) return fail("Option not found.");
  await prisma.serviceOption.delete({ where: { id } });
  await log("ServiceOption", id, { nameEn: before.nameEn, nameAr: before.nameAr }, null, g.admin.id);
  return done();
}

// priceAed "" = the option is not available in this emirate (the row is deactivated, never deleted).
export async function setOptionPrice(optionId: string, regionId: string, priceAed: string): Promise<ActionResult> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return fail(g.error);
  const existing = await prisma.serviceOptionPrice.findUnique({ where: { optionId_regionId: { optionId, regionId } } });
  if (priceAed.trim() === "") {
    if (existing?.active) {
      await prisma.serviceOptionPrice.update({ where: { id: existing.id }, data: { active: false } });
      await log("ServiceOptionPrice", existing.id, { unitPriceFils: existing.unitPriceFils, active: true }, { active: false }, g.admin.id);
    }
    return done();
  }
  const fils = aedToFils(priceAed);
  if (fils === null || fils <= 0) return fail("Enter a valid price in AED (up to 2 decimals).");
  if (fils > 100_000_000) return fail("Price is too large.");
  const saved = await prisma.serviceOptionPrice.upsert({
    where: { optionId_regionId: { optionId, regionId } },
    update: { unitPriceFils: fils, active: true },
    create: { optionId, regionId, unitPriceFils: fils },
  });
  await log("ServiceOptionPrice", saved.id, existing ? { unitPriceFils: existing.unitPriceFils, active: existing.active } : null, { unitPriceFils: fils, active: true }, g.admin.id);
  return done();
}
