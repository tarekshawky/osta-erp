// Standalone, idempotent seed for dynamic pricing. Safe to re-run against the shared DB:
// everything is upserted by a natural key and existing admin-edited prices are never overwritten.
import { prisma } from "../src/lib/prisma";

const REGIONS = [
  ["ajman", "Ajman", "عجمان"],
  ["sharjah", "Sharjah", "الشارقة"],
  ["dubai", "Dubai", "دبي"],
  ["abu-dhabi", "Abu Dhabi", "أبوظبي"],
  ["umm-al-quwain", "Umm Al Quwain", "أم القيوين"],
  ["ras-al-khaimah", "Ras Al Khaimah", "رأس الخيمة"],
  ["fujairah", "Fujairah", "الفجيرة"],
  ["al-ain", "Al Ain", "العين"],
] as const;

const AC_TIERS: [number, number, number][] = [
  [1, 1, 0], [2, 2, 10], [3, 3, 13], [4, 4, 17], [5, 5, 20],
  [6, 6, 22], [7, 7, 24], [8, 8, 26], [9, 9, 28], [10, 10, 33],
];

async function main() {
  for (const [i, [slug, nameEn, nameAr]] of REGIONS.entries()) {
    await prisma.region.upsert({ where: { slug }, update: {}, create: { slug, nameEn, nameAr, sortOrder: i } });
  }

  let ruleSet = await prisma.discountRuleSet.findFirst({ where: { name: "AC Cleaning" } });
  if (!ruleSet) {
    ruleSet = await prisma.discountRuleSet.create({
      data: {
        name: "AC Cleaning",
        tiers: { create: AC_TIERS.map(([minQty, maxQty, percent]) => ({ minQty, maxQty, percent })) },
      },
    });
  }

  await prisma.bookableService.upsert({
    where: { slug: "ac-cleaning" },
    update: {},
    create: {
      slug: "ac-cleaning",
      nameEn: "AC Cleaning",
      nameAr: "تنظيف المكيفات",
      pricingUnit: "AC_UNIT",
      discountRuleSetId: ruleSet.id,
    },
  });

  for (const [code, nameEn, nameAr, fee, sameDay, order] of [
    ["STANDARD", "Standard", "عادي", 0, false, 0],
    ["PRIORITY", "Priority", "أولوية", 5000, true, 1],
    ["EMERGENCY", "Emergency", "طارئ", 10000, true, 2],
  ] as const) {
    await prisma.bookingType.upsert({
      where: { code },
      update: {},
      create: { code, nameEn, nameAr, defaultFeeFils: fee, sameDayAllowed: sameDay, sortOrder: order },
    });
  }

  await prisma.taxSetting.upsert({ where: { id: "default" }, update: {}, create: {} });

  if ((await prisma.visitFeePolicy.count()) === 0) {
    await prisma.visitFeePolicy.create({
      data: {
        version: 1,
        amountFils: 10000,
        textAr:
          "تنويه مهم بشأن رسوم الزيارة\nفي حال تحرك فريق OSTA Services إلى موقع العميل بناءً على طلب الحجز، ثم رفض العميل استقبال الفريق أو تنفيذ الخدمة، أو تعذر التواصل مع العميل أو عدم رده عند الوصول، أو قام بإلغاء الطلب بعد تحرك الفريق، تُطبق رسوم زيارة بقيمة {amount} درهم إماراتي وفق شروط الحجز المعتمدة.\nلا تُطبق هذه الرسوم تلقائيًا عند إنشاء الطلب، وإنما عند تحقق إحدى الحالات المذكورة وفق سياسة الشركة.\nلا تسري رسوم الزيارة في حالات إلغاء الطلب من جانب الشركة أو عدم حضور الفريق، وفق الاستثناءات المعتمدة.",
        textEn:
          "Important visit-fee notice\nIf the OSTA Services team travels to your location for your booking and you then refuse the team or the service, cannot be reached on arrival, or cancel after the team has been dispatched, a visit fee of {amount} AED applies under the approved booking terms.\nThis fee is not charged automatically when the order is created; it applies only when one of the cases above occurs, per company policy.\nThe visit fee does not apply when the company cancels or the team does not show up, per the approved exceptions.",
        consentLabelAr: "أوافق على شروط الحجز وسياسة رسوم الزيارة البالغة {amount} درهم إماراتي في الحالات الموضحة أعلاه",
        consentLabelEn: "I agree to the booking terms and the {amount} AED visit-fee policy in the cases described above",
        reasons: ["CUSTOMER_REFUSED", "UNREACHABLE", "CANCELLED_AFTER_DISPATCH"],
      },
    });
  }
  console.log("pricing seed done (no prices set: add them in admin so nothing is bookable by accident)");
}

main().finally(() => prisma.$disconnect());
