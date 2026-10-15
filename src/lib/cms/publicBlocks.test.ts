import { describe, it, expect } from "vitest";
import { publicBlocks } from "./publicBlocks";
import { createBlock } from "./blocks";

describe("publicBlocks (blog posts and service pages)", () => {
  it("sends valid blocks and nothing for empty or missing data", () => {
    const b = createBlock("richText");
    expect(publicBlocks([b])).toHaveLength(1);
    expect(publicBlocks([])).toEqual([]);
    expect(publicBlocks(null)).toEqual([]);
    expect(publicBlocks(undefined)).toEqual([]);
  });
  it("never sends an invalid body to the public site", () => {
    expect(publicBlocks("not a list")).toEqual([]);
    expect(publicBlocks([{ id: "x", type: "script", props: {}, hidden: false, visibility: { desktop: true, mobile: true } }])).toEqual([]);
    const b = createBlock("richText");
    b.props = { ...b.props, body: { en: "[x](javascript:alert(1))", ar: "" } };
    expect(publicBlocks([b])).toEqual([]);
  });
});
