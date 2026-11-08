import { describe, it, expect } from "vitest";
import { BLOCK_REGISTRY, createBlock, parseBlocks } from "./blocks";

describe("advanced image block", () => {
  it("starts from valid defaults, with every setting group in the editor", () => {
    const b = createBlock("imagePro"); expect(parseBlocks([b]).ok).toBe(true);
    const keys = BLOCK_REGISTRY.imagePro.fields.map((f) => f.key); for (const k of ["imageUrl", "alt", "title", "caption", "description", "credit", "lazy", "size", "position", "frame", "effects", "link", "banner", "tablet", "mobile"]) expect(keys, k).toContain(k);
  });
  it("accepts a full clickable banner and refuses unsafe or out-of-range settings", () => {
    const b = createBlock("imagePro"); const props = b.props as Record<string, Record<string, unknown>>;
    const ok = { ...b, props: { ...props, link: { ...props.link, type: "whatsapp", whatsappText: { en: "Hi", ar: "مرحبا" } }, banner: { ...props.banner, heading: { en: "Offer", ar: "عرض" }, buttonLabel: { en: "Book", ar: "احجز" }, textColor: "#ffffff" }, frame: { ...props.frame, style: "custom", color: "#112233" } } };
    expect(parseBlocks([ok]).ok).toBe(true);
    expect(parseBlocks([{ ...b, props: { ...props, link: { ...props.link, type: "external", url: "javascript:alert(1)" } } }]).ok).toBe(false);
    expect(parseBlocks([{ ...b, props: { ...props, effects: { ...props.effects, opacity: 150 } } }]).ok).toBe(false);
    expect(parseBlocks([{ ...b, props: { ...props, frame: { ...props.frame, color: "red" } } }]).ok).toBe(false);
    expect(parseBlocks([{ ...b, props: { ...props, size: { ...props.size, cropLeft: 95 } } }]).ok).toBe(false);
    expect(parseBlocks([{ ...b, props: { ...props, imageUrl: "javascript:alert(1)" } }]).ok).toBe(false);
  });
});
