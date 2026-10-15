import { describe, it, expect } from "vitest";
import { adsProblem, buildRobotsTxt, generateLlmsTxt, robotsProblem, securityProblem, technicalProblem, AI_TRAINING_BOTS, AI_ASSISTANT_BOTS } from "./technicalFiles";
import { codeProblem, codeWarnings, isCodeConsent } from "./codeRules";

const base = { allowIndexing: true, aiPolicy: "allow" as const, extra: "", sitemapUrl: "https://x.test/sitemap.xml" };

describe("robots.txt", () => {
  it("keeps private areas out and ends with the sitemap", () => {
    const t = buildRobotsTxt(base);
    expect(t).toContain("User-agent: *\nAllow: /\nDisallow: /dashboard");
    expect(t.trim().endsWith("Sitemap: https://x.test/sitemap.xml")).toBe(true);
    expect(t).not.toContain("GPTBot");
  });
  it("blocks every crawler while the site is being rebuilt, and ignores the rest", () => {
    expect(buildRobotsTxt({ ...base, allowIndexing: false, aiPolicy: "block-all", extra: "Disallow: /x" })).toBe("User-agent: *\nDisallow: /\n");
  });
  it("AI policy: training only, or everything", () => {
    const training = buildRobotsTxt({ ...base, aiPolicy: "block-training" });
    for (const b of AI_TRAINING_BOTS) expect(training).toContain(`User-agent: ${b}\nDisallow: /`);
    for (const b of AI_ASSISTANT_BOTS) expect(training).not.toContain(`User-agent: ${b}`);
    const all = buildRobotsTxt({ ...base, aiPolicy: "block-all" });
    for (const b of [...AI_TRAINING_BOTS, ...AI_ASSISTANT_BOTS]) expect(all).toContain(`User-agent: ${b}`);
  });
  it("adds the admin's own rules before the sitemap", () => {
    const t = buildRobotsTxt({ ...base, extra: "User-agent: BadBot\nDisallow: /" });
    expect(t.indexOf("BadBot")).toBeGreaterThan(0);
    expect(t.indexOf("BadBot")).toBeLessThan(t.indexOf("Sitemap:"));
  });
  it("accepts rules and comments only", () => {
    expect(robotsProblem("# note\nUser-agent: Foo\nDisallow: /private\nCrawl-delay: 5")).toBeNull();
    expect(robotsProblem("Disallow /x")).toMatch(/Line 1/);
    expect(robotsProblem("<script>alert(1)</script>")).toMatch(/Line 1/);
  });
});

describe("ads.txt and security.txt", () => {
  it("validates ads.txt lines", () => {
    expect(adsProblem("# comment\ngoogle.com, pub-1234567890, DIRECT, f08c47fec0942fa0\nCONTACT=ads@x.test")).toBeNull();
    expect(adsProblem("google.com, pub-1, MAYBE")).toMatch(/Line 1/);
    expect(adsProblem("not an entry")).toMatch(/Line 1/);
  });
  it("security.txt needs a contact", () => {
    expect(securityProblem("Contact: mailto:sec@x.test\nExpires: 2027-01-01T00:00:00Z")).toBeNull();
    expect(securityProblem("Expires: 2027-01-01")).toMatch(/Contact/);
    expect(technicalProblem("llms", "anything")).toBeNull();
  });
});

describe("llms.txt template", () => {
  it("lists services, key pages, areas and contact details", () => {
    const t = generateLlmsTxt({ siteName: "Osta", description: "AC repair.", origin: "https://x.test", phone: "+971", email: "a@x.test", address: "Ajman", services: [{ name: "AC Repair", path: "/services/ac-repair", summary: "fast" }], pages: [{ name: "About", path: "/about" }], areas: ["Dubai", "Ajman"] });
    expect(t).toContain("# Osta");
    expect(t).toContain("> AC repair.");
    expect(t).toContain("Areas served: Dubai, Ajman.");
    expect(t).toContain("[AC Repair](https://x.test/services/ac-repair): fast");
    expect(t).toContain("[About](https://x.test/about)");
  });
});

describe("custom code rules", () => {
  const ok = { headCode: "", headCodeConsent: "analytics", bodyCode: "", bodyCodeConsent: "marketing" };
  it("accepts normal snippets", () => {
    expect(codeProblem({ ...ok, headCode: '<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script><script>window.x=1</script>' })).toBeNull();
    expect(codeProblem({ ...ok, bodyCode: '<noscript><img src="https://x.test/p.gif" alt=""></noscript>' })).toBeNull();
  });
  it("refuses unbalanced scripts, page-structure tags and bad settings", () => {
    expect(codeProblem({ ...ok, headCode: "<script>alert(1)" })).toMatch(/closing/);
    expect(codeProblem({ ...ok, bodyCode: "<body onload=x>" })).toMatch(/<body>/);
    expect(codeProblem({ ...ok, headCode: "x".repeat(50_001) })).toMatch(/50,000/);
    expect(codeProblem({ ...ok, headCodeConsent: "whenever" })).toMatch(/Choose/);
    expect(isCodeConsent("always")).toBe(true);
  });
  it("warns about http scripts and document.write", () => {
    expect(codeWarnings('<script src="http://x.test/a.js"></script>')).toHaveLength(1);
    expect(codeWarnings("<script>document.write('x')</script>")).toHaveLength(1);
    expect(codeWarnings("<script>var a=1</script>")).toEqual([]);
  });
});
