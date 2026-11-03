// Loads the four real branches of Osta Services (Ajman, Umm Al Quwain, Al Ain, Dubai) into Website → Locations. Idempotent: running it again
// updates the same branches (matched by code), never duplicates them. `--dry` shows what it would do and writes nothing.
// Data: the Google Business Profile pages and Apple Maps places of each branch. Opening hours are NOT filled in: they are not the same on
// every source, so enter the real ones in Website → Locations.
import { prisma } from "../src/lib/prisma";
import { BranchInput } from "../src/lib/locations/locations";

const AC = "Air Conditioning & HVAC Services";
const SEEDS = [
  {
    slug: "ajman", area: "ajman", nameEn: "Osta Services Ajman", nameAr: "خدمات آسطا عجمان", branchNameEn: "Ajman Branch", branchNameAr: "فرع عجمان",
    streetEn: "Paradise Lake Tower B9", streetAr: "برج بحيرة الجنة B9", localityEn: "Emirates City", localityAr: "مدينة الإمارات", regionEn: "",
    addressEn: "Paradise Lake Tower B9, Emirates City, Ajman, UAE", addressAr: "برج بحيرة الجنة B9، مدينة الإمارات، عجمان، الإمارات العربية المتحدة",
    latitude: 25.3925699, longitude: 55.5760205, cid: "8049178210296539638", apple: "I3155F068C9E2FA8A", phone: "+971568676036", rating: [5, 206] as [number, number],
    categories: [AC, "Plumbing & Sanitary Services", "Electrical Services", "Painting Services", "Cleaning Services", "Handyman & General Maintenance"],
    coverage: ["Emirates City | مدينة الإمارات", "Al Nuaimiya | النعيمية", "Al Rashidiya | الراشدية", "Al Jurf | الجرف", "Al Hamidiya | الحميدية", "Al Mowaihat | المويهات", "Al Rawda | الروضة", "Al Yasmeen | الياسمين", "Al Zahia | الزاهية", "Al Tallah | الطلة"],
    extraFaq: { q: { en: "Do you serve Emirates City, Ajman?", ar: "هل تخدمون مدينة الإمارات في عجمان؟" }, a: { en: "Yes. Our Ajman branch is in Emirates City, and we serve it together with the other areas listed on this page.", ar: "نعم. فرع عجمان في مدينة الإمارات، ونخدمها مع المناطق الأخرى المذكورة في هذه الصفحة." } },
  },
  {
    slug: "umm-al-quwain", area: "umm-al-quwain", nameEn: "Osta Services Umm Al Quwain", nameAr: "خدمات آسطا أم القيوين", branchNameEn: "Umm Al Quwain Branch", branchNameAr: "فرع أم القيوين",
    streetEn: "King Faisal St", streetAr: "شارع الملك فيصل", localityEn: "Al Butain", localityAr: "البطين", regionEn: "",
    addressEn: "King Faisal St, Al Butain, Umm Al Quwain, UAE", addressAr: "شارع الملك فيصل، البطين، أم القيوين، الإمارات العربية المتحدة",
    latitude: 25.533372, longitude: 55.538444, cid: "2769582144346270151", apple: "IC9F517C702DF44A1", phone: "+971568676036", rating: [5, 23] as [number, number],
    categories: [AC], coverage: [], extraFaq: null,
  },
  {
    slug: "al-ain", area: "al-ain", nameEn: "Osta Services Al Ain", nameAr: "خدمات آسطا العين", branchNameEn: "Al Ain Branch", branchNameAr: "فرع العين",
    streetEn: "38 Az Zanbaq 8 St", streetAr: "38 شارع الزنبق 8", localityEn: "Al Noud, Al Ain", localityAr: "النود، العين", regionEn: "Abu Dhabi",
    addressEn: "38 Az Zanbaq 8 St, Al Noud, Wadi Al Ain 1, Al Ain, Abu Dhabi, UAE", addressAr: "38 شارع الزنبق 8، النود، وادي العين 1، العين، أبوظبي، الإمارات العربية المتحدة",
    latitude: 24.1515604, longitude: 55.8329862, cid: "7824152997842393110", apple: "I82DE05FF5EDA0566", phone: "+971502032086", rating: [5, 51] as [number, number],
    categories: [AC, "Handyman & General Maintenance"], coverage: [], extraFaq: null,
  },
  {
    slug: "dubai", area: "dubai", nameEn: "Osta Services Dubai", nameAr: "خدمات آسطا دبي", branchNameEn: "Dubai Branch", branchNameAr: "فرع دبي",
    streetEn: "Zabeel Business Centre", streetAr: "مركز زعبيل للأعمال", localityEn: "Al Karama", localityAr: "الكرامة", regionEn: "",
    addressEn: "Zabeel Business Centre, Al Karama, Dubai, UAE", addressAr: "مركز زعبيل للأعمال، الكرامة، دبي، الإمارات العربية المتحدة",
    latitude: 25.2438541, longitude: 55.3097836, cid: "3012860779900663793", apple: "IBF4F87B9539CAE20", phone: "+971568676036", rating: [5, 4] as [number, number],
    categories: [AC, "Handyman & General Maintenance"], coverage: [], extraFaq: null,
  },
];

async function main() {
  const dry = process.argv.includes("--dry");
  for (const s of SEEDS) {
    const area = await prisma.serviceArea.findUnique({ where: { slug: s.area }, select: { id: true, nameEn: true } });
    if (!area) { console.log(s.slug, "-> emirate not found, skipped"); continue; }
    const cats = await prisma.catalogCategory.findMany({ where: { nameEn: { in: s.categories } }, select: { id: true, nameEn: true } });
    const missing = s.categories.filter((c) => !cats.some((x) => x.nameEn === c));
    const emirate = s.area === "al-ain" ? "Al Ain" : area.nameEn;
    const faqs = [
      { question: { en: `Where is the Osta Services ${emirate} branch?`, ar: `أين يقع فرع خدمات آسطا في ${s.nameAr.replace("خدمات آسطا ", "")}؟` }, answer: { en: `Our ${emirate} branch is at ${s.addressEn}.`, ar: `يقع فرعنا في ${s.nameAr.replace("خدمات آسطا ", "")} في ${s.addressAr}.` } },
      ...(s.extraFaq ? [{ question: s.extraFaq.q, answer: s.extraFaq.a }] : []),
    ];
    const input = {
      slug: s.slug, areaId: area.id, nameEn: s.nameEn, nameAr: s.nameAr, branchNameEn: s.branchNameEn, branchNameAr: s.branchNameAr, regionEn: s.regionEn,
      streetEn: s.streetEn, streetAr: s.streetAr, localityEn: s.localityEn, localityAr: s.localityAr, postalCode: "", addressEn: s.addressEn, addressAr: s.addressAr,
      latitude: s.latitude, longitude: s.longitude,
      mapsUrl: `https://www.google.com/maps?cid=${s.cid}`, mapsEmbedUrl: "", appleMapsUrl: `https://maps.apple.com/place?place-id=${s.apple}&_provider=9902`, businessProfileUrl: "", reviewsUrl: "",
      phone: s.phone, whatsapp: "+971568676036", email: "", hours: [], images: [], ratingValue: s.rating[0], ratingCount: s.rating[1],
      coverage: s.coverage.map((c) => { const [nameEn, nameAr] = c.split("|").map((x) => x.trim()); return { nameEn, nameAr }; }),
      faqs, categoryIds: cats.map((c) => c.id), active: true, sortOrder: SEEDS.indexOf(s),
    };
    const parsed = BranchInput.safeParse(input);
    if (!parsed.success) { console.log(s.slug, "-> INVALID:", parsed.error.issues[0].message); continue; }
    const { categoryIds, ...rest } = parsed.data;
    const data = { ...rest, hours: rest.hours as never, coverage: rest.coverage as never, faqs: rest.faqs as never };
    const exists = await prisma.branch.findUnique({ where: { slug: s.slug }, select: { id: true } });
    console.log(`${s.slug}: ${exists ? "update" : "create"} | ${s.addressEn} | ${s.latitude},${s.longitude} | ${cats.length} categories${missing.length ? ` (missing: ${missing.join(", ")})` : ""} | ${s.coverage.length} coverage areas | ${faqs.length} questions`);
    if (dry) continue;
    if (exists) await prisma.branch.update({ where: { id: exists.id }, data: { ...data, categories: { set: categoryIds.map((id) => ({ id })) } } });
    else await prisma.branch.create({ data: { ...data, categories: { connect: categoryIds.map((id) => ({ id })) } } });
  }
  console.log(dry ? "dry run: nothing written" : "done");
}
main().finally(() => prisma.$disconnect());
