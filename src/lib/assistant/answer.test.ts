import { describe, it, expect } from "vitest";
import { createAssistant, priceText, type AssistantData, type AssistantService } from "./answer";

const regions = [
  { slug: "ajman", nameEn: "Ajman", nameAr: "عجمان" },
  { slug: "sharjah", nameEn: "Sharjah", nameAr: "الشارقة" },
  { slug: "dubai", nameEn: "Dubai", nameAr: "دبي" },
  { slug: "abu-dhabi", nameEn: "Abu Dhabi", nameAr: "أبوظبي" },
  { slug: "al-ain", nameEn: "Al Ain", nameAr: "العين" },
];
const priced = (base: number, unitEn: string, unitAr: string): AssistantService["price"] => ({ mode: "PRICED", unitEn, unitAr, byRegion: { ajman: base, sharjah: Math.round(base * 1.1), dubai: Math.round(base * 1.2), "abu-dhabi": Math.round(base * 1.2), "al-ain": base } });
const AC = ["Air Conditioning & HVAC Services", "خدمات التكييف والتبريد"] as const;
const PL = ["Plumbing & Sanitary Services", "خدمات السباكة والصحي"] as const;
const svc = (slug: string, nameEn: string, nameAr: string, cat: readonly [string, string], price: AssistantService["price"]): AssistantService => ({ slug, nameEn, nameAr, category: cat[0], categoryAr: cat[1], price });

const data: AssistantData = {
  regions,
  categories: [{ nameEn: "Air Conditioning & HVAC Services", nameAr: "خدمات التكييف والتبريد" }, { nameEn: "Plumbing & Sanitary Services", nameAr: "خدمات السباكة والصحي" }],
  contact: { phone: "+971 50 000 0000", whatsapp: "971500000000", email: "hi@osta.test", hoursEn: "Daily 8am to 10pm", hoursAr: "يومياً من 8 صباحاً إلى 10 مساءً", addressEn: "", addressAr: "" },
  services: [
    svc("ac-cleaning", "AC Cleaning", "تنظيف المكيف", AC, priced(100, "per AC unit", "للمكيف")),
    svc("gas-refill", "AC Gas Refilling", "تعبئة غاز المكيف", AC, priced(250, "per AC unit", "للمكيف")),
    svc("ac-repair", "AC Repair", "إصلاح المكيف", AC, { mode: "INSPECTION" }),
    svc("drain-unclog", "Drain Unblocking", "تسليك المجاري", PL, priced(150, "per visit", "للزيارة")),
    svc("toilet-repair", "Toilet Repair", "إصلاح المرحاض", PL, priced(120, "", "")),
  ],
};
const bot = createAssistant(data);
const ask = (q: string, lang: "en" | "ar" = "en") => bot.ask(q, lang);

describe("priceText", () => {
  it("shows one price, a range, or 'after inspection'", () => {
    const [cleaning, repair] = [data.services[0], data.services[2]];
    expect(priceText(cleaning, "en", regions[2])).toBe("120 AED per AC unit");
    expect(priceText(cleaning, "en", null)).toBe("from 100 AED to 120 AED per AC unit, depending on the emirate");
    expect(priceText(cleaning, "ar", null)).toContain("من 100 AED إلى 120 AED للمكيف");
    expect(priceText(repair, "en", regions[0])).toBe("price confirmed after inspection");
    expect(priceText(repair, "ar", null)).toBe("السعر بعد المعاينة");
    expect(priceText({ ...cleaning, price: { mode: "PRICED", unitEn: "", unitAr: "", byRegion: { ajman: 80, dubai: 80 } } }, "en", null)).toBe("80 AED");
  });
});

describe("price questions", () => {
  it("answers with the price in the emirate asked about", () => {
    const r = ask("How much is AC cleaning in Dubai?");
    expect(r.answer).toContain("AC Cleaning: 120 AED per AC unit");
    expect(r.answer).toContain("in Dubai");
    expect(r.answer).toContain("before VAT");
    expect(r.matches[0]).toMatchObject({ bookSlug: "ac-cleaning", priceText: "120 AED per AC unit" });
    expect(r.links[0].href).toBe("/pricing?service=ac-cleaning");
  });
  it("answers in Arabic", () => {
    const r = ask("كم سعر تنظيف المكيف في الشارقة؟", "ar");
    expect(r.answer).toContain("تنظيف المكيف: 110 AED للمكيف");
    expect(r.answer).toContain("في الشارقة");
    expect(r.answer).toContain("قبل ضريبة");
  });
  it("shows a range when no emirate is named, and 'after inspection' where that applies", () => {
    expect(ask("AC cleaning price").answer).toContain("from 100 AED to 120 AED");
    expect(ask("how much does AC repair cost").answer).toContain("price confirmed after inspection");
  });
  it("asks which service when none is named", () => {
    const r = ask("how much do you charge?");
    expect(r.answer).toContain("Which service");
    expect(r.matches).toEqual([]);
    expect(ask("كم الأسعار؟", "ar").answer).toContain("ما الخدمة");
  });
});

describe("finding a service from a problem", () => {
  it("suggests matching services with prices and a Book link", () => {
    const r = ask("my AC is running but not cooling");
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches.map((m) => m.bookSlug)).toContain("gas-refill");
    expect(r.links[0].label).toBe("Book now");
    expect(r.links[0].href).toMatch(/^\/pricing\?service=/);
    expect(ask("المكيف لا يبرد", "ar").matches.length).toBeGreaterThan(0);
  });
  it("handles drains in Arabic", () => {
    expect(ask("المجاري مسدودة", "ar").matches[0].bookSlug).toBe("drain-unclog");
  });
});

describe("areas, hours, contact, booking", () => {
  it("lists the emirates, or confirms one", () => {
    const all = ask("which emirates do you cover?");
    expect(all.answer).toContain("Ajman");
    expect(all.answer).toContain("Al Ain");
    expect(ask("do you serve Ajman?").answer).toContain("Yes, we serve Ajman");
    expect(ask("هل تخدمون عجمان؟", "ar").answer).toContain("نعم، نخدم عجمان");
  });
  it("gives the hours and contact details from the site settings", () => {
    const r = ask("what are your working hours?");
    expect(r.answer).toContain("Daily 8am to 10pm");
    expect(r.links.map((l) => l.href)).toEqual(["https://wa.me/971500000000", "tel:+971500000000", "mailto:hi@osta.test"]);
    expect(ask("ما هو رقم الواتساب", "ar").answer).toContain("+971 50 000 0000");
  });
  it("explains how to book, with a link, and books the service named", () => {
    const r = ask("how do I book?");
    expect(r.answer).toContain("choose your emirate");
    expect(r.links[0].href).toBe("/pricing");
    const withService = ask("how do I book AC cleaning");
    expect(withService.links[0].href).toBe("/pricing?service=ac-cleaning");
    expect(ask("كيف احجز", "ar").answer).toContain("اختر الإمارة");
  });
});

describe("small talk and the unknown", () => {
  it("greets and thanks", () => {
    expect(ask("hello").answer).toContain("Hello!");
    expect(ask("مرحبا", "ar").answer).toContain("أهلاً");
    expect(ask("thanks").answer).toContain("welcome");
    expect(ask("").answer).toContain("Hello!");
  });
  it("falls back to the contact details for anything it cannot answer, and never invents a service", () => {
    const r = ask("what is the capital of France");
    expect(r.matches).toEqual([]);
    expect(r.answer).toContain("Phone: +971 50 000 0000");
    expect(r.links.length).toBeGreaterThan(0);
  });
  it("lists the categories when asked what is offered", () => {
    const r = ask("what services do you offer?");
    expect(r.answer).toContain("Air Conditioning & HVAC Services");
    expect(r.links[0].href).toBe("/services");
  });
  it("always offers things to ask", () => {
    expect(ask("hello").suggestions.length).toBeGreaterThan(2);
    expect(ask("hello", "ar").suggestions[0]).toMatch(/[؀-ۿ]/);
  });
});
