import { describe, expect, it } from "vitest";
import { normalizePhone, phoneSearchDigits, waDigits } from "./phone";
import { jobSlug } from "./slug";
import { arDays, arWorkers } from "./arabic";
import { canTransition, expectedEnd, isOpenForApplications, publicState, requiredWorkersReached } from "./status";
import { dateToDubaiLocal, dubaiLocalToDate } from "./dates";
import { applicationSchema, jobInputSchema, missingTranslations, publishProblems } from "./schema";
import { buildAdText, whatsappShareUrl, type AdJob } from "./adText";
import { jobPublicUrl } from "./urls";

describe("phone normalization", () => {
  it("turns UAE and international numbers into E.164", () => {
    expect(normalizePhone("050 123 4567")).toBe("+971501234567");
    expect(normalizePhone("0501234567")).toBe("+971501234567");
    expect(normalizePhone("+971 50-123-4567")).toBe("+971501234567");
    expect(normalizePhone("00971501234567")).toBe("+971501234567");
    expect(normalizePhone("+92 300 1234567")).toBe("+923001234567");
  });
  it("understands Arabic-Indic digits and rejects junk", () => {
    expect(normalizePhone("٠٥٠١٢٣٤٥٦٧")).toBe("+971501234567");
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("finds the same person whatever format the admin searches with", () => {
    const stored = waDigits(normalizePhone("+971501234567")!);
    for (const q of ["0501234567", "050 123 4567", "+971501234567", "971501234567"]) expect(phoneSearchDigits(q)).toBe(stored);
    expect(phoneSearchDigits("ali")).toBeNull();
  });
});

describe("slug", () => {
  it("builds category-emirate-number and never needs the title", () => {
    expect(jobSlug("painting", "AJMAN", 123)).toBe("painter-ajman-123");
    expect(jobSlug("ac-refrigeration", "ABU_DHABI", 7)).toBe("ac-technician-abu-dhabi-7");
    expect(jobSlug("custom cat!", "DUBAI", 9)).toBe("custom-cat-dubai-9");
  });
});

describe("Arabic counts", () => {
  it("uses the right singular, dual, plural and tanween forms", () => {
    expect([1, 2, 3, 10, 11, 25].map(arWorkers)).toEqual(["عامل واحد", "عاملان", "3 عمال", "10 عمال", "11 عاملًا", "25 عاملًا"]);
    expect([1, 2, 5, 11].map(arDays)).toEqual(["يوم واحد", "يومان", "5 أيام", "11 يومًا"]);
  });
});

describe("job status rules", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  it("shows the right public state", () => {
    expect(publicState({ status: "DRAFT", applicationDeadline: null })).toBe("hidden");
    expect(publicState({ status: "PUBLISHED", applicationDeadline: future })).toBe("open");
    expect(publicState({ status: "PUBLISHED", applicationDeadline: null })).toBe("open");
    expect(publicState({ status: "APPLICATIONS_CLOSED", applicationDeadline: future })).toBe("closed");
    expect(publicState({ status: "IN_PROGRESS", applicationDeadline: null })).toBe("closed");
    expect(publicState({ status: "COMPLETED", applicationDeadline: null })).toBe("completed");
    expect(publicState({ status: "CANCELLED", applicationDeadline: null })).toBe("cancelled");
  });
  it("a passed deadline closes applications but never completes the job", () => {
    expect(publicState({ status: "PUBLISHED", applicationDeadline: past })).toBe("closed");
    expect(isOpenForApplications({ status: "PUBLISHED", applicationDeadline: past })).toBe(false);
  });
  it("limits transitions", () => {
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PUBLISHED")).toBe(false);
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
  });
  it("computes the expected end and when enough workers are accepted", () => {
    expect(expectedEnd(new Date("2026-11-01T00:00:00Z"), 5)?.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(expectedEnd(null, 5)).toBeNull();
    expect(requiredWorkersReached(3, 3)).toBe(true);
    expect(requiredWorkersReached(2, 3)).toBe(false);
  });
});

describe("Dubai time", () => {
  it("converts wall-clock Dubai time to the right instant and back", () => {
    expect(dubaiLocalToDate("2026-11-01T18:00")?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(dateToDubaiLocal(new Date("2026-11-01T14:00:00Z"))).toBe("2026-11-01T18:00");
    expect(dubaiLocalToDate("2026-11-01")?.toISOString()).toBe("2026-10-31T20:00:00.000Z");
    expect(dubaiLocalToDate("nope")).toBeNull();
  });
});

describe("job schema", () => {
  const base = { type: "DAILY", categoryId: "c1", workersRequired: 3, emirate: "AJMAN", dailyWage: "150", workingDays: "5" };
  it("accepts a draft with only one language and coerces form strings", () => {
    const r = jobInputSchema.safeParse({ ...base, titleEn: "Painter" });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.dailyWage).toBe(150); expect(r.data.workingDays).toBe(5); expect(r.data.titleAr).toBe(""); }
  });
  it("rejects bad numbers and contradictory wage settings", () => {
    expect(jobInputSchema.safeParse({ ...base, workersRequired: 0 }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, type: "PERMANENT", monthlySalaryMin: 3000, monthlySalaryMax: 2000 }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, wageToBeAgreed: true }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, dailyWage: "", wageToBeAgreed: true }).success).toBe(true);
    expect(jobInputSchema.safeParse({ ...base, emirate: "MARS" }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, applicationDeadline: "tomorrow" }).success).toBe(false);
  });
  it("lists missing translations and publish blockers", () => {
    expect(missingTranslations({ titleEn: "A", titleAr: "", descriptionEn: "<p>x</p>", descriptionAr: "<p></p>" })).toEqual(["Title (Arabic)", "Description (Arabic)"]);
    expect(missingTranslations({ titleEn: "A", titleAr: "ب", descriptionEn: "x", descriptionAr: "ص" })).toEqual([]);
    expect(publishProblems({ titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", workersRequired: 1 })).toHaveLength(2);
    expect(publishProblems({ titleEn: "A", titleAr: "", descriptionEn: "x", descriptionAr: "", workersRequired: 1 })).toEqual([]);
  });
});

describe("application schema", () => {
  const ok = { fullName: "Ali Khan", phone: "0501234567", whatsappSameAsPhone: true, preferredLang: "ar", emirate: "AJMAN", consent: true, photoTokens: ["t".repeat(20)], idempotencyKey: "abcdefgh12" };
  const schema = applicationSchema({ minPhotos: 1, maxPhotos: 5 });
  it("accepts a complete application", () => expect(schema.safeParse(ok).success).toBe(true));
  it("needs a name, consent and the right number of photos", () => {
    expect(schema.safeParse({ ...ok, fullName: "Al" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(schema.safeParse({ ...ok, photoTokens: [] }).success).toBe(false);
    expect(schema.safeParse({ ...ok, photoTokens: Array.from({ length: 6 }, (_, i) => `token-number-${i}-xxxx`) }).success).toBe(false);
    expect(schema.safeParse({ ...ok, photoTokens: Array.from({ length: 5 }, (_, i) => `token-number-${i}-xxxx`) }).success).toBe(true);
  });
  it("needs a WhatsApp number when it differs, and a language when 'other'", () => {
    expect(schema.safeParse({ ...ok, whatsappSameAsPhone: false }).success).toBe(false);
    expect(schema.safeParse({ ...ok, whatsappSameAsPhone: false, whatsapp: "0509999999" }).success).toBe(true);
    expect(schema.safeParse({ ...ok, preferredLang: "other" }).success).toBe(false);
  });
  it("honours a minimum set in settings and long notes", () => {
    expect(applicationSchema({ minPhotos: 0, maxPhotos: 5 }).safeParse({ ...ok, photoTokens: [] }).success).toBe(true);
    expect(schema.safeParse({ ...ok, notes: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("WhatsApp ad text", () => {
  const daily: AdJob = {
    type: "DAILY", categoryKey: "painting", categoryNameEn: "Painting", categoryNameAr: "دهانات", emirate: "AJMAN", area: "Al Nuaimiya", propertyType: "VILLA",
    workersRequired: 3, workingDays: 5, workingDaysPerWeek: null, dailyHours: null, dailyWage: 150, monthlySalaryMin: null, monthlySalaryMax: null, wageToBeAgreed: false,
    materialsBy: null, startDate: new Date("2026-11-10T00:00:00+04:00"), applicationDeadline: new Date("2026-11-08T18:00:00+04:00"),
    fields: [{ key: "paintFinish", labelEn: "Paint Finish", labelAr: "نوع الدهان", value: "Luxury", valueAr: "لوكس" }],
  };
  const url = jobPublicUrl("painter-ajman-123");
  it("builds the Arabic daily ad from real data", () => {
    const t = buildAdText("ar", daily, url);
    expect(t).toContain("📢 مطلوب دهان للعمل باليومية — عجمان");
    expect(t).toContain("📍 الموقع: عجمان – Al Nuaimiya");
    expect(t).toContain("🏠 نوع العقار: فيلا");
    expect(t).toContain("🎨 نوع الدهان: لوكس");
    expect(t).toContain("📅 مدة العمل: 5 أيام");
    expect(t).toContain("💰 الأجر اليومي: 150 درهم");
    expect(t).toContain("👷 العدد المطلوب: 3 عمال");
    expect(t).toContain("🗓️ تاريخ البدء:");
    expect(t).toContain(url);
    expect(t).not.toMatch(/undefined|null|NaN/);
    expect(t).not.toMatch(/\n\n\n/);
  });
  it("builds the English daily ad", () => {
    const t = buildAdText("en", daily, url);
    expect(t).toContain("📢 Daily Painter Required — Ajman");
    expect(t).toContain("🎨 Paint Finish: Luxury");
    expect(t).toContain("📅 Duration: 5 working days");
    expect(t).toContain("💰 Daily Wage: AED 150");
    expect(t).toContain("👷 Workers Required: 3");
    expect(t).toContain("Submitting an application does not guarantee selection.");
  });
  it("omits missing lines and only says 'to be agreed' when chosen", () => {
    const bare = buildAdText("en", { ...daily, area: null, propertyType: null, dailyWage: null, startDate: null, applicationDeadline: null, fields: [] }, url);
    expect(bare).not.toContain("Daily Wage");
    expect(bare).not.toContain("Property Type");
    expect(bare).not.toContain("Start Date");
    expect(bare).toContain("📍 Location: Ajman");
    expect(buildAdText("en", { ...daily, dailyWage: null, wageToBeAgreed: true }, url)).toContain("💰 Daily Wage: To be agreed");
    expect(buildAdText("ar", { ...daily, dailyWage: null, wageToBeAgreed: true }, url)).toContain("💰 الأجر اليومي: يتم الاتفاق");
  });
  it("builds a permanent ad with salary and days per week", () => {
    const perm: AdJob = { ...daily, type: "PERMANENT", workingDays: null, dailyWage: null, monthlySalaryMin: 2500, monthlySalaryMax: 3500, workingDaysPerWeek: 6, dailyHours: "8 hours", workersRequired: 1, fields: [] };
    const ar = buildAdText("ar", perm, url);
    expect(ar).toContain("وظيفة ثابتة");
    expect(ar).toContain("💰 الراتب الشهري: 2,500 – 3,500 درهم");
    expect(ar).toContain("📅 أيام العمل: 6 أيام في الأسبوع");
    expect(ar).toContain("👷 العدد المطلوب: عامل واحد");
    const en = buildAdText("en", perm, url);
    expect(en).toContain("Permanent position");
    expect(en).toContain("💰 Monthly Salary: AED 2,500 – 3,500");
    expect(en).not.toContain("Duration");
  });
  it("encodes the WhatsApp link safely", () => {
    const link = whatsappShareUrl("مرحبا & اهلا\nhttps://x.test/a?b=1");
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(link.slice("https://wa.me/?text=".length))).toBe("مرحبا & اهلا\nhttps://x.test/a?b=1");
    expect(link).not.toContain("\n");
  });
});
