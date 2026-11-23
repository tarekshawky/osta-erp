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

  it("has a shape picker (preset boxes, circle, rounded and a custom shape) and keeps older pictures valid", () => {
    const frame = BLOCK_REGISTRY.imagePro.fields.find((f) => f.key === "frame") as { fields: { key: string; showIf?: { key: string; equals: string } }[] };
    const keys = frame.fields.map((f) => f.key);
    for (const k of ["shape", "ratioW", "ratioH", "radiusTL", "radiusTR", "radiusBR", "radiusBL", "clip"]) expect(keys, k).toContain(k);
    // the custom-only settings are hidden until "Custom shape" is chosen
    expect(frame.fields.find((f) => f.key === "ratioW")?.showIf).toEqual({ key: "shape", equals: "custom" });
    const b = createBlock("imagePro"); const props = b.props as Record<string, Record<string, unknown>>;
    expect(props.frame.shape).toBe("none");
    // a picture saved before shapes existed has none of the new settings and still passes
    const { shape, ratioW, ratioH, radiusTL, radiusTR, radiusBR, radiusBL, clip, ...old } = props.frame; void [shape, ratioW, ratioH, radiusTL, radiusTR, radiusBR, radiusBL, clip];
    expect(parseBlocks([{ ...b, props: { ...props, frame: old } }]).ok).toBe(true);
  });
  it("accepts every preset and a full custom shape, and refuses unknown or out-of-range ones", () => {
    const b = createBlock("imagePro"); const props = b.props as Record<string, Record<string, unknown>>;
    const withFrame = (f: Record<string, unknown>) => parseBlocks([{ ...b, props: { ...props, frame: { ...props.frame, ...f } } }]).ok;
    for (const shape of ["none", "square", "rectangle", "landscape", "portrait", "circle", "rounded", "custom"]) expect(withFrame({ shape }), shape).toBe(true);
    expect(withFrame({ shape: "custom", ratioW: 21, ratioH: 9, radiusTL: 0, radiusTR: 80, radiusBR: 0, radiusBL: 80, clip: "leaf" })).toBe(true);
    for (const clip of ["hexagon", "diamond", "arch"]) expect(withFrame({ shape: "custom", clip }), clip).toBe(true);
    expect(withFrame({ shape: "star" })).toBe(false);
    expect(withFrame({ clip: "javascript" })).toBe(false);
    expect(withFrame({ ratioW: 0 })).toBe(false);
    expect(withFrame({ ratioH: 500 })).toBe(false);
    expect(withFrame({ radiusTL: -1 })).toBe(false);
  });
});
