// Creates two example services that use Options, INACTIVE and without prices (so customers see nothing until you enter
// prices in Dynamic Pricing and switch them on). Safe to run again: a service that already exists is left alone.
// Run: npx tsx scripts/seedServiceOptions.ts
import { prisma } from "@/lib/prisma";

const SERVICES = [
  {
    slug: "ac-maintenance", nameEn: "AC Maintenance", nameAr: "صيانة المكيف", pricingUnit: "AC_UNIT",
    optionLabelEn: "What do you need?", optionLabelAr: "ماذا تحتاج؟",
    options: [
      { nameEn: "Cleaning", nameAr: "تنظيف" },
      { nameEn: "Repair", nameAr: "تصليح" },
      { nameEn: "Gas refill", nameAr: "تعبئة غاز" },
      { nameEn: "Inspection", nameAr: "فحص" },
    ],
  },
  {
    slug: "electrical-services", nameEn: "Electrical Services", nameAr: "خدمات الكهرباء", pricingUnit: "UNIT",
    optionLabelEn: "What do you need?", optionLabelAr: "ماذا تحتاج؟",
    options: [
      { nameEn: "Change lights", nameAr: "تغيير الإضاءات" },
      { nameEn: "Repair an internal electrical fault", nameAr: "تصليح عطل كهربائي داخلي" },
      { nameEn: "Repair an external electrical fault", nameAr: "تصليح عطل كهربائي خارجي" },
    ],
  },
];

(async () => {
  let top = (await prisma.bookableService.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0;
  for (const s of SERVICES) {
    if (await prisma.bookableService.findUnique({ where: { slug: s.slug } })) { console.log(s.slug, "already exists, left alone"); continue; }
    const { options, ...data } = s;
    await prisma.bookableService.create({
      data: { ...data, active: false, minQuantity: 1, sortOrder: ++top, options: { create: options.map((o, i) => ({ ...o, sortOrder: i })) } },
    });
    console.log(s.slug, "created (inactive) with", options.length, "options");
  }
  process.exit(0);
})();
