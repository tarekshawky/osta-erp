import { describe, it, expect } from "vitest";
import { BranchInput, directionsUrlFor, embedUrlFor, fullAddress, hoursProblem, hoursSummary, isAppleMapsLink, isEmbedUrl, isGoogleMapsLink, schemaHours, telHref, toPublicBranch, whatsappUrl, type HoursRow } from "./locations";

const base = {
  slug: "ajman", areaId: "a1", nameEn: "Osta Services Ajman", nameAr: "خدمات آسطا عجمان", branchNameEn: "Ajman Branch", branchNameAr: "فرع عجمان", regionEn: "",
  streetEn: "Paradise Lake Tower B9", streetAr: "", localityEn: "Emirates City", localityAr: "", postalCode: "", addressEn: "", addressAr: "",
  latitude: 25.3925699, longitude: 55.5760205, mapsUrl: "https://www.google.com/maps/place//data=!4m3!3m2!1s0x3ef5f7369234307b:0x6fb46cef968a29f6!12e1", mapsEmbedUrl: "", appleMapsUrl: "https://maps.apple.com/place?place-id=I3155F068C9E2FA8A&_provider=9902",
  businessProfileUrl: "", reviewsUrl: "", phone: "+971568676036", whatsapp: "+971568676036", email: "", hours: [], images: [], ratingValue: 5, ratingCount: 206, coverage: [], faqs: [], categoryIds: [], active: true, sortOrder: 0,
};

describe("opening hours", () => {
  const daily: HoursRow[] = [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "10:00", closes: "24:00" }];
  it("accepts a normal schedule and midnight closing", () => {
    expect(hoursProblem(daily)).toBeNull();
    expect(hoursProblem([])).toBeNull();
  });
  it("refuses bad times, empty days, closing before opening and overlaps", () => {
    expect(hoursProblem([{ days: [], opens: "10:00", closes: "18:00" }])).toMatch(/choose the days/);
    expect(hoursProblem([{ days: [1], opens: "25:00", closes: "18:00" }])).toMatch(/times must look like/);
    expect(hoursProblem([{ days: [1], opens: "18:00", closes: "10:00" }])).toMatch(/after opening/);
    expect(hoursProblem([{ days: [1], opens: "24:00", closes: "24:00" }])).toBeTruthy();
    expect(hoursProblem([{ days: [1, 2], opens: "09:00", closes: "13:00" }, { days: [2], opens: "12:00", closes: "18:00" }])).toMatch(/overlapping/);
    expect(hoursProblem([{ days: [1, 1], opens: "09:00", closes: "13:00" }])).toMatch(/each day once/);
  });
  it("summarises in both languages", () => {
    expect(hoursSummary(daily, "en")).toBe("Daily 10:00–24:00");
    expect(hoursSummary(daily, "ar")).toBe("يومياً 10:00–24:00");
    expect(hoursSummary([{ days: [0, 1, 2, 3, 4], opens: "09:00", closes: "18:00" }, { days: [5], opens: "14:00", closes: "18:00" }], "en")).toBe("Sun–Thu 09:00–18:00; Fri 14:00–18:00");
    expect(hoursSummary([{ days: [1, 3], opens: "09:00", closes: "18:00" }], "en")).toBe("Mon, Wed 09:00–18:00");
    expect(hoursSummary([], "en")).toBe("");
  });
  it("writes schema.org hours (midnight as 23:59)", () => {
    expect(schemaHours(daily)).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "10:00", closes: "23:59" }]);
  });
});

describe("links", () => {
  it("accepts the Google Maps and Apple Maps links of a place, and nothing else", () => {
    for (const u of ["https://www.google.com/maps/place//data=!4m3", "https://google.com/maps/place/x", "https://maps.google.com/maps?cid=1", "https://maps.app.goo.gl/abc", "https://goo.gl/maps/abc", "https://g.page/r/xyz"]) expect(isGoogleMapsLink(u)).toBe(true);
    for (const u of ["http://www.google.com/maps/x", "https://evil.example/maps", "javascript:alert(1)", "https://www.google.com.evil.example/maps", "https://google.com/search?q=x"]) expect(isGoogleMapsLink(u)).toBe(false);
    expect(isAppleMapsLink("https://maps.apple.com/place?place-id=I3155F068C9E2FA8A&_provider=9902")).toBe(true);
    expect(isAppleMapsLink("https://maps.apple.com.evil.example/x")).toBe(false);
  });
  it("only lets Google's embeddable map addresses into an iframe", () => {
    expect(isEmbedUrl("https://www.google.com/maps/embed?pb=!1m18")).toBe(true);
    expect(isEmbedUrl("https://maps.google.com/maps?q=25.39,55.57&output=embed")).toBe(true);
    expect(isEmbedUrl("https://www.google.com/maps/place/x")).toBe(false); // a normal map link is not embeddable
    expect(isEmbedUrl("https://evil.example/maps/embed")).toBe(false);
    expect(isEmbedUrl(embedUrlFor(25.39, 55.57))).toBe(true);
  });
  it("builds directions to the exact point, tel and WhatsApp links", () => {
    expect(directionsUrlFor(25.3925699, 55.5760205)).toBe("https://www.google.com/maps/dir/?api=1&destination=25.3925699,55.5760205");
    expect(telHref("+971 56 867 6036")).toBe("tel:+971568676036");
    expect(whatsappUrl("+971 56 867 6036")).toBe("https://wa.me/971568676036");
    expect(whatsappUrl("")).toBe("");
  });
});

describe("BranchInput", () => {
  it("accepts a real branch", () => {
    expect(BranchInput.safeParse(base).success).toBe(true);
  });
  it("catches swapped, out-of-country or missing coordinates", () => {
    expect(BranchInput.safeParse({ ...base, latitude: 55.576, longitude: 25.39 }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, latitude: 51.5, longitude: -0.12 }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, latitude: Number.NaN }).success).toBe(false);
  });
  it("refuses links that are not maps, an unsafe embed, a bad slug or email", () => {
    expect(BranchInput.safeParse({ ...base, mapsUrl: "https://evil.example/x" }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, mapsEmbedUrl: "https://evil.example/embed" }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, slug: "Ajman Branch" }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, images: ["javascript:alert(1)"] }).success).toBe(false);
  });
  it("needs both rating and review count, or neither", () => {
    expect(BranchInput.safeParse({ ...base, ratingValue: null, ratingCount: null }).success).toBe(true);
    expect(BranchInput.safeParse({ ...base, ratingValue: 5, ratingCount: null }).success).toBe(false);
  });
  it("needs an English question and answer for each FAQ, and valid hours", () => {
    expect(BranchInput.safeParse({ ...base, faqs: [{ question: { en: "Do you serve Emirates City?", ar: "" }, answer: { en: "Yes.", ar: "" } }] }).success).toBe(true);
    expect(BranchInput.safeParse({ ...base, faqs: [{ question: { en: "", ar: "س" }, answer: { en: "", ar: "ج" } }] }).success).toBe(false);
    expect(BranchInput.safeParse({ ...base, hours: [{ days: [1], opens: "18:00", closes: "10:00" }] }).success).toBe(false);
  });
});

describe("toPublicBranch", () => {
  const row = { ...base, regionEn: "", ratingValue: 5, ratingCount: 206, mapsEmbedUrl: "", hours: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "10:00", closes: "24:00" }], faqs: [], coverage: [{ nameEn: "Emirates City", nameAr: "مدينة الإمارات" }] };
  const emirate = { slug: "ajman", nameEn: "Ajman", nameAr: "عجمان" };
  it("builds the address from its parts when none is typed", () => {
    expect(fullAddress(row, emirate, "en")).toBe("Paradise Lake Tower B9, Emirates City, Ajman, UAE");
    expect(fullAddress({ ...row, addressEn: "Typed address" }, emirate, "en")).toBe("Typed address");
  });
  it("adds the generated embed and directions links, the call and WhatsApp links and the hours", () => {
    const p = toPublicBranch(row, { area: emirate, categories: [] });
    expect(p.embedUrl).toBe("https://maps.google.com/maps?q=25.3925699,55.5760205&z=16&hl=en&output=embed");
    expect(p.directionsUrl).toContain("destination=25.3925699,55.5760205");
    expect(p.telHref).toBe("tel:+971568676036");
    expect(p.whatsappUrl).toBe("https://wa.me/971568676036");
    expect(p.hoursSummary.en).toBe("Daily 10:00–24:00");
    expect(p.rating).toEqual({ value: 5, count: 206 });
    expect(p.areaSlug).toBe("ajman");
    expect(p.areaNameEn).toBe("Ajman");
    expect(p.areaNameAr).toBe("عجمان");
  });
  it("uses the typed embed address when there is one, and shows no rating without reviews", () => {
    const p = toPublicBranch({ ...row, mapsEmbedUrl: "https://www.google.com/maps/embed?pb=1", ratingCount: 0 }, { area: emirate, categories: [] });
    expect(p.embedUrl).toBe("https://www.google.com/maps/embed?pb=1");
    expect(p.rating).toBeNull();
  });
  it("ignores damaged stored JSON instead of failing", () => {
    const p = toPublicBranch({ ...row, hours: "oops", coverage: null, faqs: [{ nope: 1 }] }, { area: emirate, categories: [] });
    expect(p.hours).toEqual([]);
    expect(p.coverage).toEqual([]);
    expect(p.faqs).toEqual([]);
  });
});
