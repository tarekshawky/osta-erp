// Idempotent. Creates site settings and menus ONLY if they don't exist yet, matching the current hard-coded
// header/footer exactly so the public site looks identical on day one. Never overwrites admin edits.
import { prisma } from "../src/lib/prisma";

const AREAS = [
  ["Dubai", "دبي"], ["Abu Dhabi", "أبوظبي"], ["Sharjah", "الشارقة"], ["Ajman", "عجمان"],
  ["Al Ain", "العين"], ["Ras Al Khaimah", "رأس الخيمة"], ["Umm Al Quwain", "أم القيوين"], ["Fujairah", "الفجيرة"],
];
const HEADER = [
  ["/", "Home", "الرئيسية"], ["/services", "Services", "الخدمات"], ["/pricing", "Pricing", "الأسعار"],
  ["/blog", "Blog", "المدونة"], ["/about", "About Us", "من نحن"], ["/contact", "Contact", "تواصل معنا"],
];
const FOOTER = [
  ["/services", "Services", "الخدمات"], ["/pricing", "Pricing", "الأسعار"], ["/blog", "Blog", "المدونة"], ["/about", "About Us", "من نحن"],
];

async function main() {
  if (!(await prisma.siteSettings.findUnique({ where: { id: "default" } }))) {
    await prisma.siteSettings.create({
      data: {
        id: "default",
        descriptionEn: "Trusted AC repair, cleaning, installation, and home maintenance services across the UAE.",
        descriptionAr: "خدمات موثوقة لصيانة وتنظيف وتركيب المكيفات والصيانة المنزلية في جميع أنحاء الإمارات.",
        phone: "+971 56 867 6036",
        whatsapp: "971568676036",
        email: "info@ostaservices.com",
        footerAreas: AREAS.map(([en, ar]) => ({ en, ar })),
      },
    });
  }
  for (const [menu, rows] of [["header", HEADER], ["footer", FOOTER]] as const) {
    if ((await prisma.menuItem.count({ where: { menu } })) === 0) {
      await prisma.menuItem.createMany({ data: rows.map(([url, labelEn, labelAr], i) => ({ menu, url, labelEn, labelAr, sortOrder: i })) });
    }
  }
  console.log("site:", await prisma.siteSettings.count(), "header items:", await prisma.menuItem.count({ where: { menu: "header" } }), "footer items:", await prisma.menuItem.count({ where: { menu: "footer" } }));
}
main().finally(() => prisma.$disconnect());
