import { describe, it, expect } from "vitest";
import { BACKUP_VERSION, validateBundle } from "./backup";
import { createBlock } from "./blocks";

const page = (over: Record<string, unknown> = {}) => ({ slug: "warranty", type: "page", titleEn: "Warranty", titleAr: "الضمان", blocks: [createBlock("richText")], seo: {}, ...over });
const bundle = (over: Record<string, unknown> = {}) => ({ version: BACKUP_VERSION, pages: [page()], menus: { header: [], footer: [] }, social: [], forms: [], areas: [], redirects: [], site: null, ...over });

describe("validateBundle", () => {
  it("accepts a good bundle and summarises it", () => {
    const r = validateBundle(bundle({ social: [{ platform: "instagram", url: "https://instagram.com/osta", label: "", visible: true }], redirects: [{ from: "/old", to: "/new" }] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary).toMatchObject({ pages: 1, socialLinks: 1, redirects: 1 });
  });
  it("rejects non-backups and unknown versions", () => {
    expect(validateBundle("nope").ok).toBe(false);
    expect(validateBundle(null).ok).toBe(false);
    expect(validateBundle({ ...bundle(), version: 99 }).ok).toBe(false);
  });
  it("applies the same page rules as the editor (reserved slugs, titles, blocks, duplicates)", () => {
    const r = validateBundle(bundle({ pages: [page({ slug: "about" }), page({ slug: "ok", titleAr: "" }), page({ slug: "bad", blocks: [{ id: "x", type: "script", props: {}, hidden: false, visibility: { desktop: true, mobile: true } }] }), page({ slug: "dup" }), page({ slug: "dup" })] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const all = r.errors.join(" | ");
      expect(all).toMatch(/about/);
      expect(all).toMatch(/both titles/);
      expect(all).toMatch(/malformed/);
      expect(all).toMatch(/twice/);
    }
  });
  it("blocks script-bearing links and svg images inside imported blocks", () => {
    const hero = createBlock("hero");
    hero.props = { ...hero.props, ctas: [{ label: { en: "x", ar: "x" }, url: "javascript:alert(1)" }] };
    expect(validateBundle(bundle({ pages: [page({ blocks: [hero] })] })).ok).toBe(false);
    const img = createBlock("imageText");
    img.props = { ...img.props, imageUrl: "data:image/svg+xml;base64,AAAA" };
    expect(validateBundle(bundle({ pages: [page({ blocks: [img] })] })).ok).toBe(false);
  });
  it("only allows one homepage, which must use the internal slug", () => {
    expect(validateBundle(bundle({ pages: [page({ slug: "home", isHomepage: true })] })).ok).toBe(true);
    expect(validateBundle(bundle({ pages: [page({ slug: "other", isHomepage: true })] })).ok).toBe(false);
    expect(validateBundle(bundle({ pages: [page({ slug: "home", isHomepage: true }), page({ slug: "home2", isHomepage: true })] })).ok).toBe(false);
  });
  it("validates menus, social links, forms, areas and redirects with their own rules", () => {
    const bad = validateBundle(bundle({
      menus: { header: [{ labelEn: "A", labelAr: "", url: "/a", visible: true, showDesktop: true, showMobile: true, newTab: false, children: [] }], footer: [] },
      social: [{ platform: "facebook", url: "http://insecure.com", label: "", visible: true }],
      forms: [{ slug: "Bad Slug", nameEn: "x", nameAr: "x", fields: [], recipients: [] }],
      areas: [{ slug: "ajman", regionSlug: "ajman", nameEn: "A", nameAr: "ع", mapsUrl: "http://x" }],
      redirects: [{ from: "/about", to: "/x" }],
    }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.length).toBeGreaterThanOrEqual(5);
  });
  it("never lets an import carry a published status", () => {
    const r = validateBundle(bundle({ pages: [page({ status: "PUBLISHED" })] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect("status" in r.bundle.pages[0]).toBe(false);
  });
});
