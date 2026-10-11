import { describe, it, expect } from "vitest";
import { integrationProblem, needsConsent, type IntegrationInput } from "./integrationRules";

const base = (over: Partial<IntegrationInput> = {}): IntegrationInput => ({
  ga4Id: "", gtmId: "", metaPixelId: "", searchConsoleToken: "", bingToken: "", requireConsent: true, consentTextEn: "", consentTextAr: "", privacyUrl: "", ...over,
});

describe("integrationProblem", () => {
  it("accepts empty and well-formed IDs", () => {
    expect(integrationProblem(base())).toBeNull();
    expect(integrationProblem(base({ ga4Id: "G-ABC123XYZ4", gtmId: "GTM-ABC123", metaPixelId: "123456789012345", searchConsoleToken: "abcDEF_123-xyzABC", bingToken: "0123456789ABCDEF0123456789ABCDEF" }))).toBeNull();
  });
  it("rejects malformed IDs and anything that could carry script", () => {
    expect(integrationProblem(base({ ga4Id: "UA-12345" }))).toMatch(/Google Analytics/);
    expect(integrationProblem(base({ gtmId: "GTM-1'); alert(1);//" }))).toMatch(/Tag Manager/);
    expect(integrationProblem(base({ metaPixelId: "12ab" }))).toMatch(/Meta Pixel/);
    expect(integrationProblem(base({ searchConsoleToken: '"><script>x</script>' }))).toMatch(/Search Console/);
    expect(integrationProblem(base({ bingToken: "zzzzzzzzzzzzzzzzzz" }))).toMatch(/Bing/);
  });
  it("validates the privacy link and message length", () => {
    expect(integrationProblem(base({ privacyUrl: "/privacy" }))).toBeNull();
    expect(integrationProblem(base({ privacyUrl: "javascript:alert(1)" }))).toMatch(/Privacy/);
    expect(integrationProblem(base({ consentTextEn: "x".repeat(401) }))).toMatch(/400/);
  });
});

describe("needsConsent", () => {
  it("analytics for GA4 or GTM, marketing for the pixel, none for verification tags", () => {
    expect(needsConsent(base())).toEqual({ analytics: false, marketing: false });
    expect(needsConsent(base({ gtmId: "GTM-ABC123" }))).toEqual({ analytics: true, marketing: false });
    expect(needsConsent(base({ metaPixelId: "123456789012" }))).toEqual({ analytics: false, marketing: true });
  });
});
