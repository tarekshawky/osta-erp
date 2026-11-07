import { describe, it, expect } from "vitest";
import { composeMessage, whatsappLink, agreementUrl } from "./notify";

const ctx = { customerName: "Sara", number: "OSTA-AGR-2026-000001", url: "https://x.test/agreement/tok", total: "AED 1,739" };

describe("customer messages", () => {
  it("the payment message carries the brief's wording, the link and the amount, in both languages (the customer's own first)", () => {
    const en = composeMessage("payment", { ...ctx, lang: "en" });
    expect(en.text).toContain("Your OSTA maintenance agreement has been reviewed and approved."); expect(en.text).toContain("https://x.test/agreement/tok"); expect(en.text).toContain("AED 1,739");
    expect(en.text.indexOf("reviewed and approved")).toBeLessThan(en.text.indexOf("رابط الدفع")); expect(en.text).toContain("تمت مراجعة واعتماد اتفاقية الصيانة");
    const ar = composeMessage("payment", { ...ctx, lang: "ar" });
    expect(ar.text.indexOf("تمت مراجعة")).toBeLessThan(ar.text.indexOf("reviewed and approved")); expect(ar.subject.startsWith("تم اعتماد")).toBe(true);
  });
  it("a rejection or the final notice has no payment link, and customer text is escaped in the HTML", () => {
    expect(composeMessage("rejected", { ...ctx, lang: "en", note: "Out of area" }).text).not.toContain("https://x.test");
    expect(composeMessage("final", { ...ctx, lang: "en" }).text).not.toContain("https://x.test");
    const h = composeMessage("changes", { ...ctx, lang: "en", note: "<img src=x onerror=1>" }).html;
    expect(h).not.toContain("<img src=x"); expect(h).toContain("&lt;img");
  });
  it("the WhatsApp link opens the customer's chat with the message ready", () => {
    const link = whatsappLink("050 123 4567", "Hello 1+1")!;
    expect(link.startsWith("https://wa.me/")).toBe(true); expect(link).toContain("text=Hello%201%2B1"); expect(link.replace("https://wa.me/", "").split("?")[0]).toMatch(/^\d{9,15}$/);
    expect(whatsappLink("abc", "x")).toBeNull();
  });
  it("the customer's link points at the agreement page by its secret", () => { expect(agreementUrl("abc123")).toMatch(/\/agreement\/abc123$/); });
});
