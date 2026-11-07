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
