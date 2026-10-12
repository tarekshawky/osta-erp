import { describe, it, expect } from "vitest";
import { hideUnpublishedLinks } from "./menuLinks";

const item = (url: string, children: { url: string }[] = []) => ({ url, labelEn: url, children });
const drafts = new Set(["services-in-sharjah", "about"]);

describe("hideUnpublishedLinks", () => {
  it("hides a link to a draft page, top level or inside a dropdown", () => {
    const out = hideUnpublishedLinks([item("/"), item("/services-in-sharjah"), item("/services", [item("/services-in-sharjah"), item("/pricing")])], drafts);
    expect(out.map((m) => m.url)).toEqual(["/", "/services"]);
    expect(out[1].children.map((c) => c.url)).toEqual(["/pricing"]);
  });
  it("keeps links to pages that are not drafts, external links and built-in routes", () => {
    const out = hideUnpublishedLinks([item("/blog"), item("https://x.test/services-in-sharjah"), item("/about"), item("/services-in-dubai")], drafts);
    expect(out).toHaveLength(4);
  });
  it("drops a link-less heading whose sub-items are all hidden", () => {
    expect(hideUnpublishedLinks([item("", [item("/services-in-sharjah")])], drafts)).toEqual([]);
    expect(hideUnpublishedLinks([item("", [item("/pricing")])], drafts)).toHaveLength(1);
  });
});
