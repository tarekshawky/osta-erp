import { describe, it, expect } from "vitest";
import { applyGlobals, globalIdsIn, resolveGlobalBlocks } from "./globalBlocks";
import { createBlock, parseBlocks } from "./blocks";

const ref = (id: string, globalId: string, extra: Record<string, unknown> = {}) => ({ id, type: "global", props: { globalId }, hidden: false, visibility: { desktop: true, mobile: true }, ...extra });

describe("global blocks", () => {
  it("a reference validates like any block", () => {
    expect(parseBlocks([ref("a", "g1")]).ok).toBe(true);
    expect(parseBlocks([createBlock("global")]).ok).toBe(true);
  });
  it("finds the ids a page uses", () => {
    expect(globalIdsIn([ref("a", "g1"), createBlock("faq"), ref("b", "g1"), ref("c", "g2")]).sort()).toEqual(["g1", "g2"]);
    expect(globalIdsIn("nope")).toEqual([]);
  });
  it("swaps a reference for the current content and keeps this page's own visibility", () => {
    const cta = createBlock("ctaButtons");
    const out = applyGlobals([createBlock("faq"), ref("a", "g1", { hidden: true, visibility: { desktop: false, mobile: true } })], new Map([["g1", { type: "ctaButtons", props: cta.props }]])) as { id: string; type: string; hidden: boolean; visibility: { desktop: boolean } }[];
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: "a", type: "ctaButtons", hidden: true });
    expect(out[1].visibility.desktop).toBe(false);
    expect(parseBlocks(out).ok).toBe(true);
  });
  it("drops a reference whose global block was deleted, or that points at another reference", () => {
    expect(applyGlobals([ref("a", "gone")], new Map())).toEqual([]);
    expect(applyGlobals([ref("a", "g1")], new Map([["g1", { type: "global", props: { globalId: "g2" } }]]))).toEqual([]);
  });
  it("does not touch the database when a page has no global blocks, and survives a failing database", async () => {
    let calls = 0;
    const db = { cmsGlobalBlock: { findMany: async () => { calls++; throw new Error("no table"); } } };
    const plain = [createBlock("faq")];
    expect(await resolveGlobalBlocks(plain, db)).toBe(plain);
    expect(calls).toBe(0);
    expect(await resolveGlobalBlocks([createBlock("faq"), ref("a", "g1")], db)).toHaveLength(1);
  });
});

import { toPublicPage, withinShowWindow } from "./publicPage";

describe("show window", () => {
  const at = (iso: string) => Date.parse(iso);
  it("a block is shown only between its dates (UAE time)", () => {
    const p = { style: { showFrom: "2026-12-01", showUntil: "2026-12-31" } };
    expect(withinShowWindow(p, at("2026-11-30T19:59:59Z"))).toBe(false); // still 30 Nov 23:59 in the UAE
    expect(withinShowWindow(p, at("2026-11-30T20:00:00Z"))).toBe(true); // 1 Dec 00:00 UAE
    expect(withinShowWindow(p, at("2026-12-31T19:59:59Z"))).toBe(true); // 31 Dec 23:59 UAE
    expect(withinShowWindow(p, at("2026-12-31T20:00:00Z"))).toBe(false);
    expect(withinShowWindow({}, 0)).toBe(true);
    expect(withinShowWindow({ style: { showFrom: "", showUntil: "" } }, 0)).toBe(true);
  });
  it("visitors do not get blocks outside their window, the admin preview does", () => {
    const a = createBlock("faq"), b = { ...createBlock("faq"), props: { ...createBlock("faq").props, style: { showUntil: "2026-01-01" } } };
    const page = { id: "p", type: "page", updatedAt: new Date() };
    const snap = { slug: "s", titleEn: "t", titleAr: "ت", blocks: [a, b], seo: {} };
    expect(toPublicPage(page, snap, false, undefined, Date.parse("2026-06-01T00:00:00Z"))?.blocks).toHaveLength(1);
    expect(toPublicPage(page, snap, true, undefined, Date.parse("2026-06-01T00:00:00Z"))?.blocks).toHaveLength(2);
    expect(toPublicPage(page, snap, false, undefined, Date.parse("2025-06-01T00:00:00Z"))?.blocks).toHaveLength(2);
  });
});
