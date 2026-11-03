import { normalize, stem } from "./text";

// What visitors say -> words that appear in the service names. A visitor writes "not cooling" or «ما يبرد»; the catalogue says
// "AC Gas Refilling" and «تعبئة غاز». Each entry: the words people use (any language, any dialect), then the service words they point to.
const GROUPS: { say: string[]; mean: string[] }[] = [
  { say: ["cool", "cooling", "برد", "يبرد", "بيبرد", "تبرد", "ببرد", "تبريد", "بارد", "باردة", "حار", "حر", "سخن"], mean: ["ac", "air", "conditioning", "gas", "refill", "compressor", "مكيف", "تكييف", "غاز", "تبريد", "تعبئه"] },
  { say: ["ac", "a/c", "aircon", "air conditioner", "conditioner", "split", "مكيف", "مكيفات", "تكييف", "سبلت"], mean: ["ac", "air", "conditioning", "مكيف", "تكييف"] },
  { say: ["leak", "leaking", "leaks", "drip", "dripping", "seep", "damp", "dampness", "moisture", "تسرب", "تسريب", "يسرب", "بيسرب", "نقط", "تنقيط", "نش", "رطوبه", "تتسرب", "يقطر"], mean: ["leak", "detection", "waterproofing", "pipe", "plumbing", "تسرب", "كشف", "عزل", "سباكه", "مواسير"] },
  { say: ["clog", "clogged", "blocked", "block", "drain", "blockage", "overflow", "انسداد", "مسدود", "مسدوده", "بيطفح", "يطفح", "مجاري", "تسليك", "طفح"], mean: ["drain", "unclogging", "unblocking", "blockage", "sewer", "plumbing", "تسليك", "سباكه", "انسداد", "صرف", "بالوعات", "مراحيض"] },
  { say: ["toilet", "wc", "flush", "basin", "sink", "tap", "faucet", "shower", "حمام", "مرحاض", "حوض", "مغسله", "صنبور", "حنفيه", "دش"], mean: ["toilet", "bathroom", "sink", "tap", "faucet", "shower", "plumbing", "سباكه", "حمام", "حنفيه"] },
  { say: ["plumber", "plumbing", "pipe", "pipes", "water", "heater", "سباك", "سباكه", "ماسوره", "مواسير", "ماء", "مياه", "سخان"], mean: ["plumbing", "pipe", "water", "heater", "سباكه", "مواسير", "سخان", "مياه"] },
  { say: ["light", "lights", "lamp", "bulb", "switch", "socket", "plug", "outlet", "wiring", "power", "electric", "electrical", "electrician", "short", "breaker", "fuse", "كهرباء", "كهربا", "كهربائي", "انارة", "اضاءة", "لمبة", "لمبه", "مفتاح", "فيشة", "فيشه", "قاطع", "تماس"], mean: ["electrical", "light", "lighting", "switch", "socket", "wiring", "breaker", "كهرباء", "انارة", "اضاءه", "مفتاح", "قاطع"] },
  { say: ["paint", "painting", "wall", "walls", "color", "colour", "دهان", "دهانات", "بوية", "صبغ", "طلاء", "جدار", "جدران", "حيطان", "لون"], mean: ["painting", "paint", "wall", "دهان", "دهانات", "طلاء"] },
  { say: ["clean", "cleaning", "cleaner", "dust", "dirty", "sanitize", "deep", "تنظيف", "نظافة", "نظف", "اوساخ", "غبار", "تعقيم"], mean: ["cleaning", "clean", "تنظيف"] },
  { say: ["pest", "pests", "cockroach", "cockroaches", "ant", "ants", "rat", "rats", "mice", "mouse", "bug", "bugs", "bedbug", "termite", "insect", "insects", "mosquito", "حشرات", "حشره", "صراصير", "صرصور", "نمل", "فئران", "فار", "بق", "ارضه", "بعوض", "مكافحه"], mean: ["pest", "control", "insect", "termite", "rodent", "حشرات", "مكافحه", "آفات", "افات"] },
  { say: ["door", "doors", "lock", "locks", "key", "handle", "hinge", "باب", "ابواب", "قفل", "اقفال", "كالون", "مفتاح", "مقبض", "مفصله"], mean: ["door", "lock", "carpentry", "handle", "hinge", "باب", "ابواب", "قفل", "نجاره"] },
  { say: ["wood", "wooden", "carpenter", "carpentry", "cabinet", "cupboard", "wardrobe", "furniture", "نجار", "نجاره", "خشب", "خزانه", "دولاب", "كابينه", "اثاث"], mean: ["carpentry", "wood", "cabinet", "wardrobe", "furniture", "نجاره", "خشب", "خزانه", "اثاث"] },
  { say: ["window", "windows", "glass", "aluminium", "aluminum", "mirror", "شباك", "شبابيك", "نافذه", "نوافذ", "زجاج", "الومنيوم", "المنيوم", "مرايه"], mean: ["window", "glass", "aluminum", "aluminium", "شباك", "نوافذ", "زجاج", "المنيوم"] },
  { say: ["tile", "tiles", "tiling", "floor", "flooring", "ceramic", "marble", "grout", "بلاط", "سيراميك", "ارضيه", "رخام", "بلاطات"], mean: ["tile", "tiling", "floor", "flooring", "ceramic", "marble", "بلاط", "سيراميك", "ارضيات", "رخام"] },
  { say: ["ceiling", "gypsum", "plaster", "partition", "سقف", "اسقف", "جبس", "جبسبورد", "ديكور سقف"], mean: ["ceiling", "gypsum", "plaster", "جبس", "اسقف", "سقف"] },
  { say: ["washing", "washer", "machine", "dryer", "dishwasher", "oven", "stove", "cooker", "microwave", "appliance", "appliances", "ثلاجه", "فريزر", "غساله", "نشافه", "غسالة", "فرن", "بوتاجاز", "ميكروويف", "جهاز", "اجهزه"], mean: ["appliance", "appliances", "fridge", "refrigerator", "freezer", "washing", "machine", "oven", "dishwasher", "اجهزه", "ثلاجه", "غساله", "فرن"] },
  { say: ["fridge", "refrigerator", "refrigerators", "freezer", "ثلاجه", "ثلاجات", "فريزر", "ديب فريزر"], mean: ["refrigerator", "fridge", "freezer", "ثلاجه", "فريزر"] },
  { say: ["villa", "villas", "فيلا", "فلل", "فله"], mean: ["villa", "فلل"] },
  { say: ["house", "home", "بيت", "منزل"], mean: ["house", "home", "منزل"] },
  { say: ["apartment", "flat", "studio", "شقه", "شقق", "استوديو"], mean: ["apartment", "flat", "studio", "شقق", "شقه"] },
  { say: ["camera", "cameras", "cctv", "security", "alarm", "intercom", "smart", "كاميرا", "كاميرات", "مراقبه", "انذار", "انتركوم", "ذكي"], mean: ["cctv", "camera", "security", "smart", "alarm", "كاميرات", "مراقبه", "ذكي", "انذار"] },
  { say: ["internet", "wifi", "wi-fi", "network", "router", "lan", "telephone", "انترنت", "واي", "وايفاي", "شبكه", "راوتر", "شبكات"], mean: ["network", "networking", "wifi", "router", "internet", "شبكات", "شبكه", "واي", "انترنت"] },
  { say: ["pool", "swimming", "مسبح", "حمام سباحه", "سباحه"], mean: ["pool", "swimming", "مسابح", "مسبح"] },
  { say: ["garden", "lawn", "irrigation", "landscape", "landscaping", "plants", "حديقه", "حدائق", "عشب", "ري", "نباتات", "تنسيق"], mean: ["landscaping", "garden", "irrigation", "lawn", "حدائق", "حديقه", "ري"] },
  { say: ["fire", "smoke", "extinguisher", "sprinkler", "safety", "حريق", "دخان", "طفايه", "رشاش", "سلامه"], mean: ["fire", "safety", "alarm", "extinguisher", "حريق", "سلامه", "انذار"] },
  { say: ["solar", "panel", "panels", "energy", "شمسي", "شمسيه", "طاقه", "الواح"], mean: ["solar", "energy", "panel", "شمسيه", "طاقه"] },
  { say: ["move", "moving", "relocate", "relocation", "dismantle", "assemble", "install", "installation", "mount", "نقل", "فك", "تركيب", "ترحيل", "تثبيت"], mean: ["moving", "dismantling", "installation", "mounting", "نقل", "فك", "تركيب"] },
  { say: ["roof", "terrace", "canopy", "shade", "exterior", "facade", "سطح", "اسطح", "مظله", "مظلات", "واجهه", "واجهات", "تراس"], mean: ["roof", "canopy", "exterior", "facade", "اسطح", "مظلات", "واجهات"] },
  { say: ["kitchen", "مطبخ", "مطابخ"], mean: ["kitchen", "مطابخ", "مطبخ"] },
  { say: ["renovation", "renovate", "fitout", "fit-out", "decor", "interior", "تجديد", "ترميم", "ديكور", "تشطيب", "تشطيبات"], mean: ["renovation", "fit-out", "interior", "decor", "تجديد", "ديكور", "تشطيبات"] },
  { say: ["emergency", "urgent", "urgently", "now", "immediately", "طارئ", "طوارئ", "عاجل", "فوري", "حالا"], mean: ["emergency", "urgent", "طوارئ", "طارئه"] },
  { say: ["contract", "annual", "yearly", "amc", "monthly", "plan", "عقد", "عقود", "سنوي", "سنويه", "باقه", "باقات", "اشتراك"], mean: ["amc", "annual", "maintenance", "plan", "عقود", "سنويه", "باقات"] },
  { say: ["handyman", "fix", "repair", "broken", "handy", "general", "مصلح", "تصليح", "اصلاح", "كسر", "عطل", "تلف", "عام"], mean: ["handyman", "repair", "maintenance", "اصلاح", "صيانه"] },
  { say: ["water", "tank", "filter", "purifier", "softener", "خزان", "فلتر", "تنقيه", "معالجه"], mean: ["water", "tank", "filter", "treatment", "خزان", "فلتر", "معالجه"] },
];

// stemmed word the visitor said -> stemmed service words. Built once.
const INDEX = new Map<string, Set<string>>();
for (const g of GROUPS) {
  const mean = g.mean.map((m) => stem(normalize(m)));
  for (const s of g.say) {
    for (const word of normalize(s).split(" ")) {
      const k = stem(word);
      const set = INDEX.get(k) ?? new Set<string>();
      for (const m of mean) set.add(m);
      INDEX.set(k, set);
    }
  }
}

export const expand = (word: string): string[] => [...(INDEX.get(word) ?? [])];
