import { describe, it, expect } from "vitest";
import { normalize, stem, keywords } from "./text";
import { buildIndex, search, type SearchService } from "./search";

const S = (slug: string, nameEn: string, nameAr: string, category: string, categoryAr: string): SearchService => ({ slug, nameEn, nameAr, category, categoryAr });
const AC = ["Air Conditioning & HVAC Services", "خدمات التكييف والتبريد"] as const;
const PL = ["Plumbing & Sanitary Services", "خدمات السباكة والصحي"] as const;
const EL = ["Electrical Services", "خدمات الكهرباء"] as const;
const CL = ["Cleaning Services", "خدمات التنظيف"] as const;
const PE = ["Pest Control Services", "خدمات مكافحة الحشرات والآفات"] as const;
const WP = ["Waterproofing & Leak Detection Services", "خدمات العزل وكشف التسربات"] as const;

const catalogue: SearchService[] = [
  S("ac-cleaning", "AC Cleaning", "تنظيف المكيف", ...AC),
  S("duct-cleaning", "Duct Cleaning", "تنظيف مجاري الهواء", ...AC),
  S("gas-refill", "AC Gas Refilling", "تعبئة غاز المكيف", ...AC),
  S("ac-repair", "AC Repair", "إصلاح المكيف", ...AC),
  S("ac-installation", "AC Installation", "تركيب المكيف", ...AC),
  S("drain-unclog", "Drain Unclogging", "تسليك المجاري", ...PL),
  S("toilet-repair", "Toilet Repair", "إصلاح المرحاض", ...PL),
  S("mixer-tap", "Mixer Tap Replacement", "تغيير خلاط المياه", ...PL),
  S("water-heater", "Water Heater Repair", "إصلاح سخان المياه", ...PL),
  S("pipe-leak", "Pipe Leak Repair", "إصلاح تسرب المواسير", ...PL),
  S("light-switch", "Light Switch Repair", "إصلاح مفتاح الإنارة", ...EL),
  S("socket", "Socket Installation", "تركيب فيشة كهرباء", ...EL),
  S("breaker", "Circuit Breaker Repair", "إصلاح قاطع الكهرباء", ...EL),
  S("apartment-cleaning", "Apartment Cleaning", "تنظيف الشقق", ...CL),
  S("sofa-cleaning", "Sofa Cleaning", "تنظيف الكنب", ...CL),
  S("cockroach", "Cockroach Control", "مكافحة الصراصير", ...PE),
  S("bed-bugs", "Bed Bug Treatment", "معالجة بق الفراش", ...PE),
  S("leak-detection", "Water Leak Detection", "كشف تسرب المياه", ...WP),
  S("roof-waterproofing", "Roof Waterproofing", "عزل الأسطح", ...WP),
];
const idx = buildIndex(catalogue);
const top = (q: string, n = 3) => search(idx, q, n).map((h) => h.service.slug);

describe("text", () => {
  it("cleans Arabic letters, diacritics, digits and punctuation", () => {
    expect(normalize("المُكَيِّف!! ٣")).toBe("المكيف 3");
    expect(normalize("إصلاح مكيّفة")).toBe("اصلاح مكيفه");
    expect(normalize("AC  Repair?")).toBe("ac repair");
  });
  it("reduces words to a common stem, in both languages", () => {
    expect(stem("cooling")).toBe("cool");
    expect(stem("leaking")).toBe("leak");
    expect(stem("services")).toBe(stem("service"));
    expect(stem("cleaning")).toBe("clean");
    expect(stem("المكيف")).toBe("مكيف");
    expect(stem("بالمكيف")).toBe("مكيف");
    expect(stem("ال")).toBe("ال"); // too short to strip
  });
  it("drops filler words", () => {
    expect(keywords("My AC is not cooling")).toEqual(["ac", "cool"]);
  });
});

describe("finding services (English)", () => {
  it("AC problems", () => {
    expect(top("my AC is running but not cooling")[0]).toMatch(/^(gas-refill|ac-repair)$/);
    expect(top("AC cleaning")[0]).toBe("ac-cleaning");
    expect(top("I want to install a new AC")[0]).toBe("ac-installation");
    expect(top("clean the air duct")[0]).toBe("duct-cleaning");
  });
  it("plumbing problems", () => {
    expect(top("my toilet is clogged")).toContain("drain-unclog");
    expect(top("sink drain blocked")[0]).toBe("drain-unclog");
    expect(top("water leaking from a pipe")[0]).toBe("pipe-leak");
    expect(top("hot water heater not working")[0]).toBe("water-heater");
    expect(top("kitchen tap dripping")).toContain("mixer-tap");
  });
  it("leaks and water in the roof", () => {
    expect(top("water leaking from the ceiling")).toContain("leak-detection");
    expect(top("roof leak when it rains")).toContain("roof-waterproofing");
  });
  it("electrical", () => {
    expect(top("light switch not working")[0]).toBe("light-switch");
    expect(top("the power keeps tripping")).toContain("breaker");
    expect(top("need a new plug socket")[0]).toBe("socket");
  });
  it("cleaning and pests", () => {
    expect(top("deep clean my apartment")[0]).toBe("apartment-cleaning");
    expect(top("sofa is dirty")[0]).toBe("sofa-cleaning");
    expect(top("cockroaches in the kitchen")[0]).toBe("cockroach");
    expect(top("bed bugs")[0]).toBe("bed-bugs");
  });
});

describe("finding services (Arabic, including dialect)", () => {
  it("AC problems", () => {
    expect(top("المكيف لا يبرد")[0]).toMatch(/^(gas-refill|ac-repair)$/);
    expect(top("المكيف مش بيبرد")[0]).toMatch(/^(gas-refill|ac-repair)$/);
    expect(top("تنظيف المكيف")[0]).toBe("ac-cleaning");
    expect(top("اريد تركيب مكيف جديد")[0]).toBe("ac-installation");
  });
  it("plumbing, electrical, pests", () => {
    expect(top("المجاري مسدودة")[0]).toBe("drain-unclog");
    expect(top("في تسرب مياه من السقف")).toContain("leak-detection");
    expect(top("مفتاح الانارة لا يعمل")[0]).toBe("light-switch");
    expect(top("عندي صراصير")[0]).toBe("cockroach");
    expect(top("سخان الماء خربان")[0]).toBe("water-heater");
  });
});

describe("no match", () => {
  it("finds nothing for unrelated or empty questions", () => {
    expect(top("what is the capital of france")).toEqual([]);
    expect(top("")).toEqual([]);
    expect(top("hello")).toEqual([]);
    expect(top("???")).toEqual([]);
  });
  it("returns at most the number asked for, best first", () => {
    const hits = search(idx, "AC", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });
});
