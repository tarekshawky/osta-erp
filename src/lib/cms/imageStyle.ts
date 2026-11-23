// The look the "Crop and resize" window can give a picture before it is saved as a new picture: a shape (circle, rounded, hexagon...), a border,
// and effects (black and white, blur, opacity). Drawn on a canvas; the shape, border and effect maths here is plain code so it can be tested.
//
// Everything that scales with the picture is a percentage of its SHORTER side, so the small preview and the full-size result look the same.

export const SHAPES = ["none", "rounded", "circle", "hexagon", "diamond", "arch", "leaf"] as const;
export type Shape = (typeof SHAPES)[number];

export type Look = {
  shape: Shape;
  roundness: number; // corner roundness of "rounded", % of the shorter side (0-50)
  border: number; // border thickness, % of the shorter side (0-8)
  borderColor: string; // #rrggbb
  gray: number; // black and white, 0-100
  blur: number; // 0-10
  opacity: number; // 30-100
};

export const DEFAULT_LOOK: Look = { shape: "none", roundness: 20, border: 0, borderColor: "#0F5EFF", gray: 0, blur: 0, opacity: 100 };

export const SHAPE_LABEL: Record<Shape, string> = { none: "Rectangle", rounded: "Rounded", circle: "Circle", hexagon: "Hexagon", diamond: "Diamond", arch: "Arch", leaf: "Leaf" };

// A look that changes nothing: the picture is just cropped and resized.
export const isPlainLook = (l: Look) => l.shape === "none" && l.border <= 0 && l.gray <= 0 && l.blur <= 0 && l.opacity >= 100;

// Transparent corners (or transparency from the opacity) need a format that keeps them.
export const needsAlpha = (l: Look) => l.shape !== "none" || l.opacity < 100;

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const shorter = (w: number, h: number) => Math.min(w, h);
export const borderPx = (l: Look, w: number, h: number) => (l.border > 0 ? Math.max(2, Math.round((l.border / 100) * shorter(w, h))) : 0);
export const blurPx = (l: Look, w: number, h: number) => (l.blur > 0 ? (l.blur / 100) * shorter(w, h) * 0.3 : 0);

// The few canvas calls the drawing uses, so it can be tested with a fake.
export interface Ctx {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number): void;
  closePath(): void;
  rect(x: number, y: number, w: number, h: number): void;
}

// Corner radii (top-left, top-right, bottom-right, bottom-left) of the shapes that are rounded rectangles. Never more than half a side.
export function cornerRadii(shape: Shape, w: number, h: number, roundness: number): [number, number, number, number] {
  const half = shorter(w, h) / 2;
  switch (shape) {
    case "rounded": {
      const r = Math.min(half, (clamp(roundness, 0, 50) / 100) * shorter(w, h));
      return [r, r, r, r];
    }
    case "arch": {
      const r = Math.min(w / 2, h / 2);
      return [r, r, 0, 0];
    }
    case "leaf":
      return [0, half, 0, half];
    default:
      return [0, 0, 0, 0];
  }
}

// Draws the outline of a shape inside a w x h box (does not fill or stroke it).
export function tracePath(ctx: Ctx, shape: Shape, w: number, h: number, roundness: number) {
  ctx.beginPath();
  if (shape === "none") {
    ctx.rect(0, 0, w, h);
  } else if (shape === "circle") {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === "hexagon") {
    poly(ctx, [[0.25 * w, 0], [0.75 * w, 0], [w, 0.5 * h], [0.75 * w, h], [0.25 * w, h], [0, 0.5 * h]]);
  } else if (shape === "diamond") {
    poly(ctx, [[0.5 * w, 0], [w, 0.5 * h], [0.5 * w, h], [0, 0.5 * h]]);
  } else {
    const [tl, tr, br, bl] = cornerRadii(shape, w, h, roundness);
    ctx.moveTo(tl, 0);
    ctx.lineTo(w - tr, 0);
    if (tr) ctx.arcTo(w, 0, w, tr, tr);
    ctx.lineTo(w, h - br);
    if (br) ctx.arcTo(w, h, w - br, h, br);
    ctx.lineTo(bl, h);
    if (bl) ctx.arcTo(0, h, 0, h - bl, bl);
    ctx.lineTo(0, tl);
    if (tl) ctx.arcTo(0, 0, tl, 0, tl);
  }
  ctx.closePath();
}

function poly(ctx: Ctx, pts: [number, number][]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
}

// Black and white by `amount` percent, in place, keeping transparency. `data` is canvas RGBA bytes.
export function grayscaleData(data: Uint8ClampedArray, amount: number) {
  const a = clamp(amount, 0, 100) / 100;
  if (a <= 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i] + (g - data[i]) * a;
    data[i + 1] = data[i + 1] + (g - data[i + 1]) * a;
    data[i + 2] = data[i + 2] + (g - data[i + 2]) * a;
  }
}

export type DrawCtx = Ctx & {
  save(): void;
  restore(): void;
  clip(): void;
  stroke(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  drawImage(img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(x: number, y: number, w: number, h: number): ImageData;
  putImageData(d: ImageData, x: number, y: number): void;
  globalAlpha: number;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  filter?: string;
};

// Paints `img` (the part sx, sy, sw, sh of it) into a w x h canvas with the look applied. The corners outside a shape stay transparent.
export function drawStyled(ctx: DrawCtx, img: CanvasImageSource, src: { sx: number; sy: number; sw: number; sh: number }, w: number, h: number, look: Look) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (look.shape !== "none") {
    tracePath(ctx, look.shape, w, h, look.roundness);
    ctx.clip();
  }
  ctx.globalAlpha = clamp(look.opacity, 0, 100) / 100;
  const blur = blurPx(look, w, h);
  // `filter` is missing in some browsers (older Safari): the picture is then drawn sharp rather than failing.
  if (blur > 0 && typeof ctx.filter === "string") ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
  if (typeof ctx.filter === "string") ctx.filter = "none";
  ctx.restore();

  if (look.gray > 0) {
    const d = ctx.getImageData(0, 0, w, h);
    grayscaleData(d.data, look.gray);
    ctx.putImageData(d, 0, 0);
  }

  const b = borderPx(look, w, h);
  if (b > 0) {
    // Stroking the outline twice as thick and keeping only the inside of the shape gives exactly `b` pixels of border.
    ctx.save();
    tracePath(ctx, look.shape, w, h, look.roundness);
    ctx.clip();
    ctx.lineWidth = b * 2;
    ctx.strokeStyle = /^#[0-9a-fA-F]{6}$/.test(look.borderColor) ? look.borderColor : "#0F5EFF";
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
  }
}
