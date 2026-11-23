// The geometry behind the mouse editor for the advanced image block: dragging a crop rectangle over the picture, dragging the picture's box to
// resize it, and snapping it to the left, centre or right. Pure (no DOM), so it can be tested; the component only turns pointer moves into numbers.
//
// The crop settings the block stores are percentages cut from each side (0 to 80); here the visible part is a rectangle of fractions (0 to 1).

export type Rect = { x: number; y: number; w: number; h: number };
export type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

// The smallest visible part is 20% of the picture on each axis. That alone keeps every side's crop within the 80% the block allows.
export const MIN_SIDE = 0.2;

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export type CropPercents = { cropTop: number; cropRight: number; cropBottom: number; cropLeft: number };

// The visible rectangle for the crop settings saved on the block.
export function rectFromCrop(c: Partial<CropPercents>): Rect {
  const l = clamp((c.cropLeft ?? 0) / 100, 0, 1 - MIN_SIDE), t = clamp((c.cropTop ?? 0) / 100, 0, 1 - MIN_SIDE);
  const r = clamp((c.cropRight ?? 0) / 100, 0, 1 - MIN_SIDE - l), b = clamp((c.cropBottom ?? 0) / 100, 0, 1 - MIN_SIDE - t);
  return { x: l, y: t, w: 1 - l - r, h: 1 - t - b };
}

// The crop settings for a visible rectangle. A sliver under a tenth of a percent counts as no crop.
export function cropFromRect(r: Rect): CropPercents {
  const clean = (n: number) => (n < 0.05 ? 0 : clamp(round1(n), 0, 80));
  return { cropLeft: clean(r.x * 100), cropTop: clean(r.y * 100), cropRight: clean((1 - r.x - r.w) * 100), cropBottom: clean((1 - r.y - r.h) * 100) };
}

type Nat = { w: number; h: number };

// Moves or resizes the visible rectangle by (dx, dy), both fractions of the picture. With `ratio` (width over height of the visible part in
// picture pixels, for example 1 for a square) the shape stays locked while resizing. Never leaves the picture or goes below MIN_SIDE.
export function dragCrop(start: Rect, handle: Handle, dx: number, dy: number, lock?: { ratio: number; nat: Nat }): Rect {
  if (handle === "move") return { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) };
  let x1 = start.x, y1 = start.y, x2 = start.x + start.w, y2 = start.y + start.h;
  if (handle.includes("w")) x1 = clamp(x1 + dx, 0, x2 - MIN_SIDE);
  if (handle.includes("e")) x2 = clamp(x2 + dx, x1 + MIN_SIDE, 1);
  if (handle.includes("n")) y1 = clamp(y1 + dy, 0, y2 - MIN_SIDE);
  if (handle.includes("s")) y2 = clamp(y2 + dy, y1 + MIN_SIDE, 1);
  if (!lock) return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

  // Locked shape: the side you drag decides the size, the other side follows, and the edge opposite the handle stays where it is.
  const hOfW = (w: number) => (w * lock.nat.w) / (lock.ratio * lock.nat.h);
  const wOfH = (h: number) => (h * lock.ratio * lock.nat.h) / lock.nat.w;
  const horizontal = handle.includes("e") || handle.includes("w"), vertical = handle.includes("n") || handle.includes("s");
  let w = x2 - x1, h = y2 - y1;
  if (horizontal) h = hOfW(w);
  else w = wOfH(h);
  if (horizontal && vertical) {
    // A corner follows whichever of the two moves is larger.
    const byW = { w, h: hOfW(w) }, byH = { w: wOfH(h), h };
    ({ w, h } = Math.abs(byW.w - start.w) >= Math.abs(byH.h - start.h) ? byW : byH);
  }
  // Where the rectangle may grow to: from the fixed edge (or the centre, for a side handle) to the picture's edge.
  const fixedX = handle.includes("w") ? start.x + start.w : handle.includes("e") ? start.x : start.x + start.w / 2;
  const fixedY = handle.includes("n") ? start.y + start.h : handle.includes("s") ? start.y : start.y + start.h / 2;
  const roomW = handle.includes("w") ? fixedX : handle.includes("e") ? 1 - fixedX : 2 * Math.min(fixedX, 1 - fixedX);
  const roomH = handle.includes("n") ? fixedY : handle.includes("s") ? 1 - fixedY : 2 * Math.min(fixedY, 1 - fixedY);
  const k = Math.min(1, roomW / w, roomH / h);
  w *= k;
  h *= k;
  if (w < MIN_SIDE || h < MIN_SIDE) {
    const up = Math.max(MIN_SIDE / w, MIN_SIDE / h);
    w *= up;
    h *= up;
  }
  const nx = handle.includes("w") ? fixedX - w : handle.includes("e") ? fixedX : fixedX - w / 2;
  const ny = handle.includes("n") ? fixedY - h : handle.includes("s") ? fixedY : fixedY - h / 2;
  return { x: clamp(nx, 0, 1 - w), y: clamp(ny, 0, 1 - h), w, h };
}

// Reshapes the visible rectangle to a chosen shape (width over height in picture pixels), keeping its centre and staying inside the picture.
export function fitRatio(r: Rect, ratio: number, nat: Nat): Rect {
  const hOfW = (w: number) => (w * nat.w) / (ratio * nat.h);
  let w = r.w, h = hOfW(w);
  if (h > r.h) {
    h = r.h;
    w = (h * ratio * nat.h) / nat.w;
  }
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

// The largest stored size of a media-library picture, so cropping starts from the sharpest version. Any other address is used as it is.
export function sharpestSource(src: string): string {
  return /\/api\/media\/[a-z0-9]+$/.test(src) ? `${src}?w=4000` : src;
}

// The pixels to cut from the picture for a visible rectangle, and how large the new picture will be. `maxWidth` (0 = keep the size) shrinks the
// result when it is wider; a picture is never enlarged, so nothing is made blurrier.
export function cropOutput(nat: Nat, r: Rect, maxWidth: number) {
  const sx = Math.round(r.x * nat.w), sy = Math.round(r.y * nat.h);
  const sw = Math.max(1, Math.min(nat.w - sx, Math.round(r.w * nat.w))), sh = Math.max(1, Math.min(nat.h - sy, Math.round(r.h * nat.h)));
  const scale = maxWidth > 0 && sw > maxWidth ? maxWidth / sw : 1;
  return { sx, sy, sw, sh, outW: Math.max(1, Math.round(sw * scale)), outH: Math.max(1, Math.round(sh * scale)) };
}

// ---- size of the picture's box on the page ----

export type Box = { w: number; h: number };
export type BoxHandle = "e" | "s" | "se";

// Resizes the picture's box by dragging its right edge, bottom edge or bottom-right corner (px in the preview). With `ratio` (width over
// height) the box keeps its shape: the corner drives the width and the height follows.
export function dragBox(start: Box, handle: BoxHandle, dx: number, dy: number, limit: { maxW: number; minW?: number; minH?: number }, ratio?: number): Box {
  const minW = limit.minW ?? 40, minH = limit.minH ?? 40;
  let w = handle === "s" ? start.w : clamp(start.w + dx, minW, limit.maxW);
  let h = handle === "e" ? start.h : Math.max(minH, start.h + dy);
  if (ratio && ratio > 0) {
    if (handle === "s") {
      w = clamp(h * ratio, minW, limit.maxW);
      h = w / ratio;
    } else h = w / ratio;
  }
  return { w, h };
}

// The block's size settings for a dragged box. A box that keeps the picture's shape gets an automatic height (so it stays right on every
// screen); a box stretched out of shape gets a height in pixels, scaled from the preview's width to the real page width.
export function sizeFromBox(box: Box, previewWidth: number, pageWidth: number, keepShape: boolean) {
  const width = clamp(Math.round((box.w / previewWidth) * 100), 10, 100);
  const height = keepShape ? 0 : clamp(Math.round((box.h * pageWidth) / previewWidth), 20, 5000);
  return { mode: "custom" as const, width, widthUnit: "%" as const, height, heightUnit: "px" as const };
}

// Dropping the box aligns it to whichever of the left, middle or right place it is nearest to. (Judging by the box's centre alone would never
// reach "right" for a wide box, whose centre cannot get that far.)
export function alignFromOffset(left: number, boxWidth: number, previewWidth: number): "start" | "center" | "end" {
  const free = Math.max(0, previewWidth - boxWidth);
  const spots = [["start", 0], ["center", free / 2], ["end", free]] as const;
  return spots.reduce((best, s) => (Math.abs(left - s[1]) < Math.abs(left - best[1]) ? s : best))[0];
}

// Where a click on the picture puts the focus point, in percent (the part of a filled box that stays visible).
export function focusFromPoint(x: number, y: number, width: number, height: number) {
  return { focusX: clamp(Math.round((x / width) * 100), 0, 100), focusY: clamp(Math.round((y / height) * 100), 0, 100) };
}
