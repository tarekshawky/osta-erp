import { describe, expect, it } from "vitest";
import { MIN_SIDE, alignFromOffset, cropOutput, sharpestSource, cropFromRect, dragBox, dragCrop, fitRatio, focusFromPoint, rectFromCrop, sizeFromBox, type Rect } from "./imageEdit";
import { parseBlocks, createBlock } from "./blocks";

const full: Rect = { x: 0, y: 0, w: 1, h: 1 };
const nat = { w: 1200, h: 800 };
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("crop rectangle", () => {
  it("round-trips with the saved crop percentages", () => {
    expect(rectFromCrop({})).toEqual(full);
    const r = rectFromCrop({ cropLeft: 10, cropRight: 20, cropTop: 5, cropBottom: 0 });
    close(r.x, 0.1); close(r.w, 0.7); close(r.y, 0.05); close(r.h, 0.95);
    expect(cropFromRect(r)).toEqual({ cropLeft: 10, cropTop: 5, cropRight: 20, cropBottom: 0 });
  });
  it("treats a sliver as no crop and never writes more than the block allows", () => {
    expect(cropFromRect({ x: 0.0003, y: 0, w: 0.9997, h: 1 })).toEqual({ cropLeft: 0, cropTop: 0, cropRight: 0, cropBottom: 0 });
    for (const bad of [{ cropLeft: 95 }, { cropLeft: 70, cropRight: 70 }, { cropTop: 90, cropBottom: 90 }]) {
      const out = cropFromRect(rectFromCrop(bad));
      for (const v of Object.values(out)) expect(v).toBeLessThanOrEqual(80);
      expect(parseBlocks([withCrop(out)]).ok).toBe(true);
    }
  });
  it("moves the visible part but keeps it inside the picture", () => {
    const r: Rect = { x: 0.2, y: 0.2, w: 0.5, h: 0.5 };
    expect(dragCrop(r, "move", 0.1, -0.05)).toEqual({ x: 0.30000000000000004, y: 0.15000000000000002, w: 0.5, h: 0.5 });
    expect(dragCrop(r, "move", 5, 5)).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    expect(dragCrop(r, "move", -5, -5)).toEqual({ x: 0, y: 0, w: 0.5, h: 0.5 });
  });
  it("resizes from each side and corner, never inverted, never off the picture, never below the smallest part", () => {
    const r: Rect = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 };
    expect(dragCrop(r, "e", 0.1, 0)).toMatchObject({ x: 0.2, w: expect.closeTo(0.7, 6) });
    expect(dragCrop(r, "w", 0.1, 0)).toMatchObject({ x: expect.closeTo(0.3, 6), w: expect.closeTo(0.5, 6) });
    expect(dragCrop(r, "n", 0, -0.1)).toMatchObject({ y: expect.closeTo(0.1, 6), h: expect.closeTo(0.7, 6) });
    expect(dragCrop(r, "se", 0.05, 0.05)).toMatchObject({ w: expect.closeTo(0.65, 6), h: expect.closeTo(0.65, 6) });
    const tiny = dragCrop(r, "e", -5, 0); close(tiny.w, MIN_SIDE);
    const flipped = dragCrop(r, "w", 5, 0); close(flipped.w, MIN_SIDE); expect(flipped.x + flipped.w).toBeLessThanOrEqual(1);
    const huge = dragCrop(r, "se", 5, 5); close(huge.x + huge.w, 1); close(huge.y + huge.h, 1);
    for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const) {
      for (const [dx, dy] of [[-9, -9], [9, 9], [-9, 9], [9, -9], [0.03, -0.02]]) {
        const o = dragCrop(r, h, dx, dy);
        expect(o.w, `${h} ${dx},${dy}`).toBeGreaterThanOrEqual(MIN_SIDE - 1e-9); expect(o.h).toBeGreaterThanOrEqual(MIN_SIDE - 1e-9);
        expect(o.x).toBeGreaterThanOrEqual(-1e-9); expect(o.y).toBeGreaterThanOrEqual(-1e-9);
        expect(o.x + o.w).toBeLessThanOrEqual(1 + 1e-9); expect(o.y + o.h).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
  it("keeps a locked shape (a square, 16:9...) while resizing, anchored on the opposite corner", () => {
    // a 600x600px square taken from the middle of the 1200x800 picture
    const sq: Rect = { x: 0.25, y: 0.125, w: 0.5, h: 0.75 };
    const out = dragCrop(sq, "se", 0.1, 0, { ratio: 1, nat });
    close(out.x, 0.25); close(out.y, 0.125); // the top-left corner did not move
    close((out.w * nat.w) / (out.h * nat.h), 1);
    const north = dragCrop(sq, "nw", -0.05, -0.05, { ratio: 16 / 9, nat });
    close((north.w * nat.w) / (north.h * nat.h), 16 / 9);
    close(north.x + north.w, 0.75); close(north.y + north.h, 0.875); // the bottom-right corner did not move
    // against the picture's edge it stops growing but keeps its shape
    const edge = dragCrop(sq, "se", 5, 5, { ratio: 1, nat });
    close((edge.w * nat.w) / (edge.h * nat.h), 1);
    expect(edge.x + edge.w).toBeLessThanOrEqual(1 + 1e-9); expect(edge.y + edge.h).toBeLessThanOrEqual(1 + 1e-9);
    // a side handle grows the other axis around the centre
    const side = dragCrop({ x: 0.3, y: 0.3, w: 0.4, h: 0.6 }, "e", 0.1, 0, { ratio: 1, nat });
    close((side.w * nat.w) / (side.h * nat.h), 1);
    close(side.x, 0.3); // the left edge stayed put
    close(side.y + side.h / 2, 0.6); // and the height grew around the middle
  });
});

describe("fit to a chosen shape", () => {
  it("reshapes the visible part to a square or 16:9 around its centre without leaving the picture", () => {
    const sq = fitRatio(full, 1, nat); // 1200x800 -> 800x800
    close((sq.w * nat.w) / (sq.h * nat.h), 1); close(sq.h, 1); close(sq.x + sq.w / 2, 0.5);
    const wide = fitRatio(full, 16 / 9, nat);
    close((wide.w * nat.w) / (wide.h * nat.h), 16 / 9); close(wide.w, 1); close(wide.y + wide.h / 2, 0.5);
    const off = fitRatio({ x: 0.7, y: 0.1, w: 0.3, h: 0.5 }, 1, nat);
    expect(off.x + off.w).toBeLessThanOrEqual(1 + 1e-9); expect(off.x).toBeGreaterThanOrEqual(0); expect(off.y + off.h).toBeLessThanOrEqual(1 + 1e-9);
    close((off.w * nat.w) / (off.h * nat.h), 1);
  });
});

describe("cutting a new picture", () => {
  it("takes exactly the visible part, at full size unless asked to shrink", () => {
    expect(cropOutput(nat, full, 0)).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 800, outW: 1200, outH: 800 });
    expect(cropOutput(nat, { x: 0.25, y: 0.125, w: 0.5, h: 0.75 }, 0)).toEqual({ sx: 300, sy: 100, sw: 600, sh: 600, outW: 600, outH: 600 });
  });
  it("shrinks to a chosen width keeping the shape, and never enlarges", () => {
    expect(cropOutput(nat, full, 600)).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 800, outW: 600, outH: 400 });
    expect(cropOutput(nat, { x: 0, y: 0, w: 0.25, h: 0.25 }, 1600)).toMatchObject({ sw: 300, sh: 200, outW: 300, outH: 200 }); // asked for 1600, only 300 exist
  });
  it("stays inside the picture even when rounding would push it over the edge", () => {
    const o = cropOutput({ w: 999, h: 333 }, { x: 0.3337, y: 0.3337, w: 0.6663, h: 0.6663 }, 0);
    expect(o.sx + o.sw).toBeLessThanOrEqual(999); expect(o.sy + o.sh).toBeLessThanOrEqual(333);
    expect(o.sw).toBeGreaterThan(0); expect(o.sh).toBeGreaterThan(0);
  });
});

describe("which version of a picture is cropped", () => {
  it("starts from the sharpest stored size of a media-library picture, and leaves any other address alone", () => {
    expect(sharpestSource("https://osta-invoices.vercel.app/api/media/cmwt805s70002s6y9l8rvgdae")).toBe("https://osta-invoices.vercel.app/api/media/cmwt805s70002s6y9l8rvgdae?w=4000");
    expect(sharpestSource("/api/media/abc123")).toBe("/api/media/abc123?w=4000");
    expect(sharpestSource("https://osta-invoices.vercel.app/api/media/abc123?w=480")).toBe("https://osta-invoices.vercel.app/api/media/abc123?w=480"); // already a chosen size
    expect(sharpestSource("https://www.ostaservices.com/photo.webp")).toBe("https://www.ostaservices.com/photo.webp");
    expect(sharpestSource("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });
});

describe("size of the picture on the page", () => {
  const limit = { maxW: 500 };
  it("drags the right edge, bottom edge and corner within the page width", () => {
    const start = { w: 300, h: 200 };
    expect(dragBox(start, "e", 100, 50, limit)).toEqual({ w: 400, h: 200 });
    expect(dragBox(start, "s", 100, 50, limit)).toEqual({ w: 300, h: 250 });
    expect(dragBox(start, "se", 100, 50, limit)).toEqual({ w: 400, h: 250 });
    expect(dragBox(start, "e", 999, 0, limit).w).toBe(500); // never wider than the page
    expect(dragBox(start, "e", -999, 0, limit).w).toBe(40); // never vanishes
    expect(dragBox(start, "s", 0, -999, limit).h).toBe(40);
  });
  it("keeps the picture's shape when asked", () => {
    expect(dragBox({ w: 300, h: 200 }, "se", 90, 10, limit, 1.5)).toEqual({ w: 390, h: 260 });
    const s = dragBox({ w: 300, h: 200 }, "s", 0, 60, limit, 1.5); close(s.w / s.h, 1.5);
  });
  it("turns a dragged box into the block's size settings: percent width, automatic height when the shape is kept", () => {
    expect(sizeFromBox({ w: 250, h: 150 }, 500, 1100, true)).toEqual({ mode: "custom", width: 50, widthUnit: "%", height: 0, heightUnit: "px" });
    expect(sizeFromBox({ w: 250, h: 150 }, 500, 1100, false)).toEqual({ mode: "custom", width: 50, widthUnit: "%", height: 330, heightUnit: "px" }); // 150px of a 500px preview = 330px of a 1100px page
    expect(sizeFromBox({ w: 5, h: 5 }, 500, 1100, true).width).toBe(10);
    expect(sizeFromBox({ w: 900, h: 5 }, 500, 1100, false)).toMatchObject({ width: 100, height: 20 });
  });
  it("aligns by where the box is dropped and picks the focus point from a click", () => {
    expect(alignFromOffset(0, 200, 600)).toBe("start");
    expect(alignFromOffset(200, 200, 600)).toBe("center");
    expect(alignFromOffset(400, 200, 600)).toBe("end");
    expect(alignFromOffset(90, 200, 600)).toBe("start");
    expect(alignFromOffset(290, 200, 600)).toBe("center");
    expect(alignFromOffset(310, 200, 600)).toBe("end");
    // a wide box can only slide a little: dragging it all the way right still means "right"
    expect(alignFromOffset(97, 338, 435)).toBe("end");
    expect(alignFromOffset(50, 338, 435)).toBe("center");
    expect(alignFromOffset(10, 338, 435)).toBe("start");
    expect(alignFromOffset(5, 435, 435)).toBe("start"); // a full-width box has nowhere to go
    expect(focusFromPoint(150, 50, 300, 200)).toEqual({ focusX: 50, focusY: 25 });
    expect(focusFromPoint(-20, 999, 300, 200)).toEqual({ focusX: 0, focusY: 100 });
  });
});

function withCrop(c: Record<string, number>) {
  const b = createBlock("imagePro"); const props = b.props as Record<string, Record<string, unknown>>;
  return { ...b, props: { ...props, size: { ...props.size, ...c } } };
}
