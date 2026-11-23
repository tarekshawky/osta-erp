import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK, SHAPES, blurPx, borderPx, cornerRadii, drawStyled, grayscaleData, isPlainLook, needsAlpha, tracePath, type DrawCtx, type Look } from "./imageStyle";

// A canvas that only writes down what it was asked to do.
function fake() {
  const calls: string[] = [];
  const n = (v: number) => Math.round(v * 100) / 100;
  const ctx = {
    filter: "none", globalAlpha: 1, lineWidth: 1, strokeStyle: "",
    beginPath: () => calls.push("begin"), closePath: () => calls.push("close"), clip: () => calls.push("clip"), stroke: () => calls.push(`stroke ${ctx.lineWidth} ${ctx.strokeStyle}`),
    save: () => calls.push("save"), restore: () => calls.push("restore"), clearRect: () => calls.push("clear"),
    moveTo: (x: number, y: number) => calls.push(`M ${n(x)},${n(y)}`), lineTo: (x: number, y: number) => calls.push(`L ${n(x)},${n(y)}`),
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) => calls.push(`A ${n(x1)},${n(y1)} ${n(x2)},${n(y2)} r${n(r)}`),
    ellipse: (x: number, y: number, rx: number, ry: number) => calls.push(`E ${n(x)},${n(y)} ${n(rx)}x${n(ry)}`), rect: (x: number, y: number, w: number, h: number) => calls.push(`R ${x},${y} ${w}x${h}`),
    drawImage: (...a: unknown[]) => calls.push(`draw ${a.slice(1).join(",")} alpha=${ctx.globalAlpha} filter=${ctx.filter}`),
    getImageData: (_x: number, _y: number, w: number, h: number) => { calls.push("getImageData"); return { data: new Uint8ClampedArray(w * h * 4).fill(200), width: w, height: h } as unknown as ImageData; },
    putImageData: () => calls.push("putImageData"),
  };
  return { ctx: ctx as unknown as DrawCtx, calls };
}
const look = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...p });

describe("shapes", () => {
  it("draws a plain rectangle, a circle that fills the box, and the polygon shapes with the same points as the website", () => {
    let f = fake(); tracePath(f.ctx, "none", 300, 200, 20); expect(f.calls).toEqual(["begin", "R 0,0 300x200", "close"]);
    f = fake(); tracePath(f.ctx, "circle", 300, 300, 0); expect(f.calls).toEqual(["begin", "E 150,150 150x150", "close"]);
    f = fake(); tracePath(f.ctx, "hexagon", 400, 400, 0); expect(f.calls).toEqual(["begin", "M 100,0", "L 300,0", "L 400,200", "L 300,400", "L 100,400", "L 0,200", "close"]);
    f = fake(); tracePath(f.ctx, "diamond", 400, 400, 0); expect(f.calls).toEqual(["begin", "M 200,0", "L 400,200", "L 200,400", "L 0,200", "close"]);
  });
  it("rounds the corners of a rounded rectangle by a share of the shorter side, never more than half", () => {
    expect(cornerRadii("rounded", 400, 200, 20)).toEqual([40, 40, 40, 40]);
    expect(cornerRadii("rounded", 400, 200, 50)).toEqual([100, 100, 100, 100]);
    expect(cornerRadii("rounded", 400, 200, 99)).toEqual([100, 100, 100, 100]); // capped at half
    expect(cornerRadii("none", 400, 200, 20)).toEqual([0, 0, 0, 0]);
    const f = fake(); tracePath(f.ctx, "rounded", 400, 200, 20);
    expect(f.calls.filter((c) => c.startsWith("A "))).toHaveLength(4);
  });
  it("gives the arch a fully rounded top and square bottom, and the leaf two opposite rounded corners", () => {
    expect(cornerRadii("arch", 300, 400, 0)).toEqual([150, 150, 0, 0]);
    expect(cornerRadii("arch", 400, 200, 0)).toEqual([100, 100, 0, 0]); // a wide arch cannot curve more than its height allows
    expect(cornerRadii("leaf", 400, 200, 0)).toEqual([0, 100, 0, 100]);
    const f = fake(); tracePath(f.ctx, "leaf", 300, 300, 0); expect(f.calls.filter((c) => c.startsWith("A "))).toHaveLength(2);
  });
  it("closes every shape", () => {
    for (const s of SHAPES) { const f = fake(); tracePath(f.ctx, s, 240, 180, 20); expect(f.calls[0]).toBe("begin"); expect(f.calls.at(-1)).toBe("close"); }
  });
});

describe("the look", () => {
  it("knows when nothing changes and when transparency is needed", () => {
    expect(isPlainLook(DEFAULT_LOOK)).toBe(true);
    expect(isPlainLook(look({ shape: "circle" }))).toBe(false);
    expect(isPlainLook(look({ border: 1 }))).toBe(false);
    expect(isPlainLook(look({ gray: 10 }))).toBe(false);
    expect(isPlainLook(look({ opacity: 90 }))).toBe(false);
    expect(needsAlpha(DEFAULT_LOOK)).toBe(false);
    expect(needsAlpha(look({ shape: "hexagon" }))).toBe(true);
    expect(needsAlpha(look({ opacity: 80 }))).toBe(true);
    expect(needsAlpha(look({ gray: 100, border: 3 }))).toBe(false);
  });
  it("scales border and blur with the picture so the preview matches the result", () => {
    expect(borderPx(look({ border: 0 }), 600, 400)).toBe(0);
    expect(borderPx(look({ border: 2 }), 600, 400)).toBe(8); // 2% of the shorter side (400)
    expect(borderPx(look({ border: 2 }), 60, 40)).toBe(2); // never thinner than 2 px
    expect(borderPx(look({ border: 2 }), 1200, 800)).toBe(16);
    expect(blurPx(look({ blur: 0 }), 600, 400)).toBe(0);
    expect(blurPx(look({ blur: 5 }), 600, 400)).toBeCloseTo(6, 5);
    expect(blurPx(look({ blur: 5 }), 1200, 800)).toBeCloseTo(12, 5);
  });
  it("turns pixels grey by the chosen amount and keeps transparency", () => {
    const px = new Uint8ClampedArray([255, 0, 0, 120, 0, 255, 0, 255]);
    const half = px.slice(); grayscaleData(half, 50);
    expect(half[3]).toBe(120); expect(half[7]).toBe(255); // alpha untouched
    expect(half[0]).toBeLessThan(255); expect(half[1]).toBeGreaterThan(0);
    const full = px.slice(); grayscaleData(full, 100);
    expect(full[0]).toBe(full[1]); expect(full[1]).toBe(full[2]); // a true grey
    expect(Math.round(full[0])).toBe(Math.round(0.299 * 255));
    const none = px.slice(); grayscaleData(none, 0); expect([...none]).toEqual([...px]);
  });
});

describe("painting the picture", () => {
  const src = { sx: 10, sy: 20, sw: 600, sh: 400 };
  it("draws only the chosen part, clipped to the shape, with the opacity", () => {
    const f = fake(); drawStyled(f.ctx, {} as CanvasImageSource, src, 300, 300, look({ shape: "circle", opacity: 60 }));
    expect(f.calls.slice(0, 6)).toEqual(["clear", "save", "begin", "E 150,150 150x150", "close", "clip"]);
    expect(f.calls.find((c) => c.startsWith("draw"))).toBe("draw 10,20,600,400,0,0,300,300 alpha=0.6 filter=none");
  });
  it("blurs through the canvas filter and puts it back afterwards", () => {
    const f = fake(); drawStyled(f.ctx, {} as CanvasImageSource, src, 600, 400, look({ blur: 5 }));
    expect(f.calls.find((c) => c.startsWith("draw"))).toContain("filter=blur(6.00px)");
    expect((f.ctx as unknown as { filter: string }).filter).toBe("none");
  });
  it("still works where the canvas has no filter support (the picture is just sharp)", () => {
    const f = fake(); delete (f.ctx as { filter?: string }).filter;
    expect(() => drawStyled(f.ctx, {} as CanvasImageSource, src, 600, 400, look({ blur: 5 }))).not.toThrow();
  });
  it("greys the result only when asked, and draws the border inside the shape's edge at the right thickness and colour", () => {
    let f = fake(); drawStyled(f.ctx, {} as CanvasImageSource, src, 600, 400, look({}));
    expect(f.calls).not.toContain("getImageData"); expect(f.calls.some((c) => c.startsWith("stroke"))).toBe(false);
    f = fake(); drawStyled(f.ctx, {} as CanvasImageSource, src, 600, 400, look({ gray: 100, border: 2, borderColor: "#112233", shape: "rounded" }));
    expect(f.calls).toContain("getImageData"); expect(f.calls).toContain("putImageData");
    expect(f.calls).toContain("stroke 16 #112233"); // 2 x 8 px, half of it clipped away = 8 px of border
    expect(f.calls.indexOf("clip", f.calls.indexOf("putImageData"))).toBeGreaterThan(-1); // the border is clipped to the shape too
  });
  it("ignores a border colour that is not a plain hex colour", () => {
    const f = fake(); drawStyled(f.ctx, {} as CanvasImageSource, src, 600, 400, look({ border: 2, borderColor: "red; evil" }));
    expect(f.calls).toContain("stroke 16 #0F5EFF");
  });
});
