import { describe, it, expect } from "vitest";
import { BUILT_IN_SEEDS } from "./pageSeeds";
import { BUILT_IN_PAGES, publishProblems } from "./pageRules";
import { parseBlocks } from "./blocks";

describe("built-in page templates", () => {
  for (const slug of BUILT_IN_PAGES) {
    it(`${slug}: every block is valid and the page can be published as-is`, () => {
      const seed = BUILT_IN_SEEDS[slug];
      const blocks = seed.blocks();
      expect(parseBlocks(blocks).ok).toBe(true);
      expect(publishProblems({ slug, titleEn: seed.titleEn, titleAr: seed.titleAr, blocks })).toEqual([]);
    });
  }
  it("a section background accepts an image, overlay and colours, and rejects bad values", () => {
    const [hero, text] = BUILT_IN_SEEDS.about.blocks();
    const good = { ...text, props: { ...text.props, style: { bgImage: "https://x.test/a.webp", overlay: 40, overlayColor: "#0a2a5a", bgColor: "#ffffff" } } };
    expect(parseBlocks([hero, good]).ok).toBe(true);
    for (const style of [{ overlay: 120 }, { overlayColor: "red" }, { bgColor: "#12" }, { bgImage: "javascript:alert(1)" }]) {
      expect(parseBlocks([hero, { ...text, props: { ...text.props, style } }]).ok).toBe(false);
    }
  });
});
