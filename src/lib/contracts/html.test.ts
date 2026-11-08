import { describe, it, expect } from "vitest";
import { renderAddendumHtml, renderContractHtml, type ContractDocInput } from "./html";
import { DEFAULT_CLAUSES } from "./clauses";
import type { ContractSnapshot } from "./snapshot";

const snapshot: ContractSnapshot = {
  schema: 1, groupKey: "",
  customer: { name: "Sara <script>alert(1)</script> Ahmed", phone: "+971501234567", whatsapp: "", email: "sara@example.com" },
  property: { emirate: "Dubai", area: "Marina", address: "Tower 1, Apt 1204", type: "Apartment", bedrooms: 2, bathrooms: 3, floors: 1, size: 1450, acUnits: 5, notes: "Gate code 1234" },
  package: { id: "p", nameEn: "Gold Package", nameAr: "الباقة الذهبية", durationMonths: 12, lines: [{ serviceEn: "AC Maintenance", serviceAr: "صيانة المكيفات", quantityEn: "2 visits/year", quantityAr: "زيارتان", limit: null, metric: "" }], excluded: [{ en: "Duct Cleaning", ar: "تنظيف المجاري" }], acUnitsCovered: 5, handymanHours: null, visits: [{ en: "AC Maintenance: 2 visits/year", ar: "صيانة المكيفات: زيارتان" }], bullets: [], specialTerms: { en: ["One property only."], ar: ["عقار واحد فقط."] } },
  extras: [{ labelEn: "Additional AC Units", labelAr: "مكيفات إضافية", qty: 2, unitPrice: 120, amount: 240, included: false }],
  openItems: [], pricing: { currency: "AED", packagePrice: 1499, additional: 240, discount: 0, subtotal: 1739, vatPercent: 5, vat: 82.81, pricesIncludeVat: true, total: 1739, quote: false },
  terms: { id: "t", version: 3, clauses: DEFAULT_CLAUSES },
  checks: [{ en: "I confirm everything is accurate.", ar: "أقر بصحة البيانات." }],
};
const doc = (over: Partial<ContractDocInput> = {}): ContractDocInput => ({
  snapshot, lang: "en", kind: "draft", number: "OSTA-AGR-2026-000001", requestNumber: "OSTA-REQ-2026-000001", version: 1, createdAt: new Date("2026-11-07T10:00:00Z"),
  acceptedAt: new Date("2026-11-07T10:05:00Z"), acceptanceMethod: "Website", paymentStatus: "unpaid", paymentMethod: "", paymentReference: "", paidAt: null, activationDate: null, expiryDate: null, approvedAt: null, ...over,
});

describe("the agreement document", () => {
  it("a draft is clearly marked DRAFT – PENDING APPROVAL, and claims no payment", () => {
    const h = renderContractHtml(doc());
    expect(h).toContain("DRAFT – PENDING APPROVAL"); expect(h).not.toContain("PAID &amp; ACTIVATED"); expect(h).toContain("Unpaid – awaiting approval and payment");
    expect(h).toContain("On confirmed payment"); expect(h).toContain("Pending approval");
  });
  it("the final one says FINAL – PAID & ACTIVATED with its dates and payment reference", () => {
    const h = renderContractHtml(doc({ kind: "final", paymentStatus: "paid", paidAt: new Date("2026-11-08T08:00:00Z"), paymentReference: "TRX-9981", activationDate: new Date("2026-11-08T08:00:00Z"), expiryDate: new Date("2027-11-08T08:00:00Z"), approvedAt: new Date("2026-11-07T12:00:00Z") }));
    expect(h).toContain("FINAL – PAID &amp; ACTIVATED"); expect(h).toContain("TRX-9981"); expect(h).toContain("08 November 2027"); expect(h).not.toContain("DRAFT – PENDING");
  });
  it("an agreement activated on an approved arrangement never says PAID", () => {
    const h = renderContractHtml(doc({ kind: "final", paymentStatus: "arrangement", activationDate: new Date(), expiryDate: new Date() }));
    expect(h).toContain("APPROVED PAYMENT ARRANGEMENT"); expect(h).not.toContain("PAID &amp; ACTIVATED"); expect(h).toContain("payment still due");
  });
  it("has every part of the brief: details, parties, property, package, extras, price, term, all 18 clauses, responsibilities, acceptance", () => {
    const h = renderContractHtml(doc());
    for (const k of ["Agreement Details", "Customer &amp; Property Details", "Selected Package &amp; Services", "Additional Services Requested", "Financial Summary", "Agreement Term", "Terms &amp; Conditions", "Responsibilities of the Parties", "Customer Acknowledgement", "Agreement Record"]) expect(h, k).toContain(k);
    expect(h).toContain("OSTA-AGR-2026-000001"); expect(h).toContain("OSTA-REQ-2026-000001"); expect(h).toContain("Ostaa Technical Services Co. L.L.C S.O.C."); expect(h).toContain("0568676036"); expect(h).toContain("www.ostaservices.com");
    expect((h.match(/<div class="clause">/g) ?? []).length).toBe(18); expect(h).toContain("Terms version 3"); expect(h).toContain("Gate code 1234"); expect(h).toContain("Duct Cleaning"); expect(h).toContain("One property only.");
    expect(h).toContain("2 visits/year"); expect(h).toContain("AED 1,499"); expect(h).toContain("AED 1,739");
  });
  it("shows VAT the way the settings say: included in the price, or added", () => {
    expect(renderContractHtml(doc())).toContain("include VAT");
    const excl = renderContractHtml(doc({ snapshot: { ...snapshot, pricing: { ...snapshot.pricing, pricesIncludeVat: false, total: 1821.81 } } }));
    expect(excl).toContain("exclude VAT"); expect(excl).not.toContain("Prices above include VAT");
  });
  it("is fully Arabic and right-to-left in Arabic, left-to-right in English", () => {
    const ar = renderContractHtml(doc({ lang: "ar" }));
    expect(ar).toContain('dir="rtl"'); expect(ar).toContain('lang="ar"'); expect(ar).toContain("مسودة – بانتظار الاعتماد"); expect(ar).toContain("الباقة الذهبية"); expect(ar).toContain("نطاق الاتفاقية"); expect(ar).toContain("أ. بيانات الاتفاقية");
    expect(ar).not.toContain("Agreement Scope"); expect(ar).toContain('dir="ltr"'); // numbers and the phone stay left-to-right inside Arabic
    expect(renderContractHtml(doc())).toContain('dir="ltr"');
  });
  it("cannot be hijacked by what the customer typed", () => {
    const h = renderContractHtml(doc());
    expect(h).not.toContain("<script>alert(1)</script>"); expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
  it("is the same page every time for the same record, and draws from the snapshot, not from anything live", () => {
    const strip = (s: string) => s.replace(/Issued on<\/td><td>[^<]*/, "");
    expect(strip(renderContractHtml(doc()))).toBe(strip(renderContractHtml(doc())));
  });
  it("an acceptance recorded by the admin says so and never shows the customer's statements as ticked", () => {
    const h = renderContractHtml(doc({ acceptanceMethod: "Recorded by Layla: WhatsApp message on 7 Nov" }));
    expect(h).toContain("recorded by OSTA Services on the customer"); expect(h).toContain("WhatsApp message on 7 Nov"); expect(h).not.toContain("I confirm everything is accurate."); expect(h).not.toContain("Accepted electronically on");
  });
  it("an unaccepted agreement says so, an accepted one lists the statements and when", () => {
    expect(renderContractHtml(doc({ acceptedAt: null }))).toContain("has not yet accepted");
    expect(renderContractHtml(doc())).toContain("I confirm everything is accurate."); expect(renderContractHtml(doc())).toContain("Accepted electronically on");
  });
});

describe("the addendum document", () => {
  const a = { contractNumber: "OSTA-AGR-2026-000001", number: "OSTA-ADD-2026-000001", lang: "en" as const, issuedAt: new Date(), titleEn: "Extra AC unit", titleAr: "وحدة تكييف إضافية", bodyEn: "One more AC unit is added.", bodyAr: "إضافة وحدة تكييف.", amountChange: 120, customerName: "Sara", propertyAddress: "Marina, Tower 1", currency: "AED", acceptedAt: null };
  it("names the original agreement, states the price change, and waits for the customer's approval", () => {
    const h = renderAddendumHtml(a);
    expect(h).toContain("OSTA-ADD-2026-000001"); expect(h).toContain("OSTA-AGR-2026-000001"); expect(h).toContain("+ AED 120"); expect(h).toContain("Awaiting the customer"); expect(h).toContain("remain unchanged");
    expect(renderAddendumHtml({ ...a, lang: "ar", amountChange: -50 })).toContain("- 50 د.إ");
  });
});
