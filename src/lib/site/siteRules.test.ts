import { describe, it, expect } from "vitest";
import { menuProblem, settingsProblem, socialProblem, whatsappLink, type MenuItemInput, type SettingsInput } from "./siteRules";

const settings = (over: Partial<SettingsInput> = {}): SettingsInput => ({
  siteNameEn: "OSTA", siteNameAr: "أسطا", taglineEn: "", taglineAr: "", descriptionEn: "", descriptionAr: "", logoUrl: "", faviconUrl: "",
  defaultLocale: "en", allowIndexing: true, copyrightEn: "", copyrightAr: "", phone: "+971 56 867 6036", whatsapp: "971568676036",
  whatsappMessageEn: "", whatsappMessageAr: "", email: "info@ostaservices.com", addressEn: "", addressAr: "", hoursEn: "", hoursAr: "",
  mapsUrl: "", businessProfileUrl: "", headerCtaLabelEn: "Book", headerCtaLabelAr: "احجز", headerCtaUrl: "/orders/new",
  footerAreas: [{ en: "Dubai", ar: "دبي" }],
  waPopupEnabled: true, waPopupAutoOpen: true, waPopupDelaySeconds: 10, waPopupTitleEn: "Chat", waPopupTitleAr: "تواصل", waPopupTextEn: "24/7", waPopupTextAr: "٢٤/٧", waPopupButtonEn: "Start", waPopupButtonAr: "ابدأ",
  ...over,
});
const item = (over: Partial<MenuItemInput> = {}): MenuItemInput => ({ labelEn: "A", labelAr: "أ", url: "/a", visible: true, showDesktop: true, showMobile: true, newTab: false, children: [], ...over });

describe("settingsProblem", () => {
  it("accepts good settings", () => expect(settingsProblem(settings())).toBeNull());
  it("rejects bad WhatsApp, email and phone", () => {
    expect(settingsProblem(settings({ whatsapp: "+971 56" }))).toMatch(/digits only/);
    expect(settingsProblem(settings({ email: "nope" }))).toMatch(/Email/);
    expect(settingsProblem(settings({ phone: "abc" }))).toMatch(/Phone/);
  });
  it("blocks unsafe links and images", () => {
    expect(settingsProblem(settings({ headerCtaUrl: "javascript:alert(1)" }))).toMatch(/Header button/);
    expect(settingsProblem(settings({ logoUrl: "data:image/svg+xml;base64,AAAA" }))).toMatch(/Logo/);
    expect(settingsProblem(settings({ mapsUrl: "ftp://x" }))).toMatch(/https/);
  });
  it("needs names and a valid locale", () => {
    expect(settingsProblem(settings({ siteNameAr: " " }))).toMatch(/Site name/);
    expect(settingsProblem(settings({ defaultLocale: "fr" }))).toMatch(/language/);
  });
  it("WhatsApp pop-up: needs a number, a sensible delay and bounded text", () => {
    expect(settingsProblem(settings({ whatsapp: "" }))).toMatch(/WhatsApp number/);
    expect(settingsProblem(settings({ whatsapp: "", waPopupEnabled: false }))).toBeNull();
    expect(settingsProblem(settings({ waPopupDelaySeconds: -1 }))).toMatch(/delay/);
    expect(settingsProblem(settings({ waPopupDelaySeconds: 121 }))).toMatch(/delay/);
    expect(settingsProblem(settings({ waPopupDelaySeconds: 2.5 }))).toMatch(/delay/);
    expect(settingsProblem(settings({ waPopupTextEn: "x".repeat(301) }))).toMatch(/up to/);
  });
  it("needs bilingual footer areas", () => expect(settingsProblem(settings({ footerAreas: [{ en: "Dubai", ar: "" }] }))).toMatch(/footer area/));
});

describe("menuProblem", () => {
  it("accepts a nested menu", () => expect(menuProblem([item({ children: [item()] })])).toBeNull());
  it("rejects missing labels, bad links, and 3 levels", () => {
    expect(menuProblem([item({ labelAr: "" })])).toMatch(/label/);
    expect(menuProblem([item({ url: "javascript:x" })])).toMatch(/valid link/);
    expect(menuProblem([item({ url: "" })])).toMatch(/needs a link/);
    expect(menuProblem([item({ children: [item({ children: [item({ children: [item()] })] })] })])).toMatch(/two levels/);
  });
  it("caps the size", () => expect(menuProblem(Array.from({ length: 41 }, () => item()))).toMatch(/40/));
});

describe("social + whatsapp", () => {
  it("requires https and a name for custom", () => {
    expect(socialProblem({ platform: "facebook", url: "http://x.com", label: "" })).toMatch(/https/);
    expect(socialProblem({ platform: "custom", url: "https://x.com", label: "" })).toMatch(/name/);
    expect(socialProblem({ platform: "instagram", url: "https://instagram.com/osta", label: "" })).toBeNull();
    expect(socialProblem({ platform: "myspace", url: "https://x.com", label: "" })).toMatch(/platform/);
  });
  it("builds a prefilled WhatsApp link", () => {
    expect(whatsappLink("971568676036", "Hi OSTA")).toBe("https://wa.me/971568676036?text=Hi%20OSTA");
    expect(whatsappLink("971568676036", "")).toBe("https://wa.me/971568676036");
  });
});

describe("Areas We Cover menu item", () => {
  const item = (url: string, children: MenuItemInput[] = []): MenuItemInput => ({ labelEn: "Areas", labelAr: "مناطق", url, visible: true, showDesktop: true, showMobile: true, newTab: false, children });
  it("is accepted as a top-level item", () => expect(menuProblem([item("#areas")])).toBeNull());
  it("is refused when nested", () => expect(menuProblem([item("/services", [item("#areas")])])).not.toBeNull());
  it("other # links are still refused", () => expect(menuProblem([item("#nope")])).not.toBeNull());
});

describe("menu items without a link", () => {
  const mk = (url: string, children: MenuItemInput[] = []): MenuItemInput => ({ labelEn: "Menu", labelAr: "قائمة", url, visible: true, showDesktop: true, showMobile: true, newTab: false, children });
  it("a heading with sub-items needs no link", () => expect(menuProblem([mk("", [mk("/pricing")])])).toBeNull());
  it("a heading with no sub-items is refused", () => expect(menuProblem([mk("")])).not.toBeNull());
  it("a sub-item still needs a link", () => expect(menuProblem([mk("", [mk("")])])).not.toBeNull());
});
