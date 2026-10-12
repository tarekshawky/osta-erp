import { describe, it, expect } from "vitest";
import { buildLinkToken, hasUnsafeInlineLink, isSafeLinkUrl, parseInline, stripInline } from "./inlineLinks";

describe("inline links", () => {
  it("parses text, links and their style flags", () => {
    expect(parseInline("Book on our [pricing page](/pricing){b,u} today.")).toEqual([
      { kind: "text", text: "Book on our " },
      { kind: "link", text: "pricing page", url: "/pricing", bold: true, thin: false, underline: true, newTab: false },
      { kind: "text", text: " today." },
    ]);
  });
  it("opens in the same tab unless the n flag is given", () => {
    const [a] = parseInline("[a](/x)") as { newTab: boolean }[];
    const [b] = parseInline("[a](https://x.test){n}") as { newTab: boolean }[];
    expect([a.newTab, b.newTab]).toEqual([false, true]);
  });
  it("thin is ignored when bold is set", () => {
    expect(parseInline("[a](/x){b,t}")[0]).toMatchObject({ bold: true, thin: false });
    expect(parseInline("[a](/x){t,u}")[0]).toMatchObject({ bold: false, thin: true, underline: true });
  });
  it("never turns an unsafe address into a link", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "http://insecure.test", "vbscript:x"]) {
      expect(parseInline(`[x](${bad})`)).toEqual([{ kind: "text", text: `[x](${bad})` }]);
      expect(hasUnsafeInlineLink(`[x](${bad})`)).toBe(true);
    }
    expect(isSafeLinkUrl("tel:+971500000000")).toBe(true);
    expect(isSafeLinkUrl("mailto:a@b.co")).toBe(true);
  });
  it("strips markup down to the visible text", () => {
    expect(stripInline("Call [us](tel:+97150){b} or read the [guide](https://x.test){n,u}.")).toBe("Call us or read the guide.");
    expect(stripInline("no links, just [brackets] (and parens)")).toBe("no links, just [brackets] (and parens)");
  });
  it("builds a token and refuses bad input", () => {
    expect(buildLinkToken({ text: "Pricing", url: "/pricing", bold: true, underline: true })).toBe("[Pricing](/pricing){b,u}");
    expect(buildLinkToken({ text: "Plain", url: "/x" })).toBe("[Plain](/x)");
    expect(buildLinkToken({ text: "", url: "/x" })).toBeNull();
    expect(buildLinkToken({ text: "bad]", url: "/x" })).toBeNull();
    expect(buildLinkToken({ text: "x", url: "javascript:1" })).toBeNull();
    expect(buildLinkToken({ text: "x", url: "/a b" })).toBeNull();
  });
});
