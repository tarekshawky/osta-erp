import { describe, it, expect } from "vitest";
import { changedCodeBlocks, codeOf, cssProblem, hasCode, jsProblem, jsWarnings } from "./blockCode";
import { createBlock, parseBlocks } from "./blocks";

const withCode = (style: Record<string, unknown>, id = "blk_a") => ({ ...createBlock("heading"), id, props: { ...createBlock("heading").props, style } });

describe("block CSS rules", () => {
  it("accepts ordinary and nested CSS", () => {
    for (const css of ["", "color: red;", "h2 { color: #fff; } & a:hover { text-decoration: underline; }", "background: url(\"/a.png\"); @media (max-width: 600px) { h2 { font-size: 1rem; } }", "/* note { */ color: red;"]) expect(cssProblem(css), css).toBeNull();
  });
  it("refuses anything that could escape the block or load remote code", () => {
    for (const css of ["</style><script>x</script>", "@import url(//evil.test/a.css);", "a { background: url(javascript:alert(1)); }", "width: expression(alert(1));", "a { -moz-binding: url(x); }", "a { color: red; ", "color: red; } body { display: none; } .x {", "a { b: url(x }"])
      expect(cssProblem(css), css).not.toBeNull();
  });
  it("limits the size", () => {
    expect(cssProblem("a{}".repeat(5000))).not.toBeNull();
  });
});

describe("block JS rules", () => {
  it("accepts normal code and refuses script-closing text", () => {
    expect(jsProblem("block.classList.add('x');")).toBeNull();
    expect(jsProblem("var s='</script>';")).not.toBeNull();
    expect(jsProblem("x<!--y")).not.toBeNull();
    expect(jsWarnings("document.write('x'); eval('1')")).toHaveLength(2);
  });
});

describe("code in the block schema", () => {
  it("validates through parseBlocks like any other setting", () => {
    expect(parseBlocks([withCode({ customCss: "h2 { color: red; }", customJs: "block.dataset.x = '1';", customJsConsent: "always" })]).ok).toBe(true);
    expect(parseBlocks([withCode({ customCss: "</style>" })]).ok).toBe(false);
    expect(parseBlocks([withCode({ customJs: "</script>" })]).ok).toBe(false);
    expect(parseBlocks([withCode({ customJsConsent: "sometimes" })]).ok).toBe(false);
  });
});

describe("who changed the code", () => {
  const stored = [withCode({ customCss: "h2 { color: red; }", customJs: "go();", customJsConsent: "analytics" })];
  it("reads and detects code", () => {
    expect(codeOf(stored[0].props)).toEqual({ css: "h2 { color: red; }", js: "go();", consent: "analytics" });
    expect(hasCode(createBlock("faq").props)).toBe(false);
    expect(hasCode(stored[0].props)).toBe(true);
  });
  it("unchanged code is not a change; new or edited code is", () => {
    expect(changedCodeBlocks(stored, stored)).toEqual([]);
    expect(changedCodeBlocks([withCode({ customCss: "h2 { color: blue; }", customJs: "go();" })], stored)).toEqual(["blk_a"]);
    expect(changedCodeBlocks([withCode({ customCss: "h2 { color: red; }", customJs: "go();", customJsConsent: "always" })], stored)).toEqual(["blk_a"]);
    expect(changedCodeBlocks([withCode({ customJs: "go();" }, "blk_new")], stored)).toEqual(["blk_new"]); // a copied block is "new"
    expect(changedCodeBlocks([withCode({ customCss: "a{}" }, "blk_x")], [])).toEqual(["blk_x"]);
  });
  it("removing code, or blocks without code, is not a change", () => {
    expect(changedCodeBlocks([withCode({})], stored)).toEqual([]);
    expect(changedCodeBlocks([createBlock("faq")], stored)).toEqual([]);
    expect(changedCodeBlocks([], "not an array")).toEqual([]);
  });
});
