import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { MediaError, pickVariant, processImage, sanitizeFileName, textUsesAsset } from "./process";

const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 90, b: 200 } } }).png().toBuffer();

describe("processImage", () => {
  it("makes WebP variants up to the original width, never upscaling", async () => {
    const out = await processImage(await png(2000, 1000));
    expect(out.width).toBe(2000);
    expect(out.variants.map((v) => v.width)).toEqual([480, 960, 1600, 2000]);
    expect(out.variants.every((v) => v.format === "webp" && v.bytes > 0)).toBe(true);
    const meta = await sharp(out.variants[0].data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(480);
  });
  it("keeps a single variant for a small image", async () => {
    const out = await processImage(await png(300, 200));
    expect(out.variants.map((v) => v.width)).toEqual([300]);
  });
  it("swaps dimensions for EXIF-rotated photos", async () => {
    const jpeg = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#fff" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const out = await processImage(jpeg);
    expect([out.width, out.height]).toEqual([400, 800]);
  });
  it("rejects svg, junk bytes, empty and oversize files", async () => {
    await expect(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).rejects.toBeInstanceOf(MediaError);
    await expect(processImage(Buffer.from("not an image at all"))).rejects.toBeInstanceOf(MediaError);
    await expect(processImage(Buffer.alloc(0))).rejects.toBeInstanceOf(MediaError);
    await expect(processImage(Buffer.alloc(10 * 1024 * 1024 + 1))).rejects.toThrow(/10 MB/);
  });
});

describe("pickVariant", () => {
  const v = [{ width: 480 }, { width: 960 }, { width: 1600 }, { width: 2400 }];
  it("returns the smallest variant that is wide enough", () => {
    expect(pickVariant(v, 500)?.width).toBe(960);
    expect(pickVariant(v, 480)?.width).toBe(480);
  });
  it("falls back to the largest when asked for more than exists", () => expect(pickVariant(v, 5000)?.width).toBe(2400));
  it("defaults to the biggest up to 1600", () => {
    expect(pickVariant(v)?.width).toBe(1600);
    expect(pickVariant([{ width: 2400 }])?.width).toBe(2400);
  });
  it("handles an empty list", () => expect(pickVariant([], 100)).toBeNull());
});

describe("names and usage matching", () => {
  it("sanitises file names", () => {
    expect(sanitizeFileName("C:\\fakepath\\my<photo>.jpg")).toBe("myphoto.jpg");
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("")).toBe("image");
  });
  it("finds an asset reference regardless of host or size", () => {
    expect(textUsesAsset('{"imageUrl":"https://admin.example.com/api/media/abc123?w=960"}', "abc123")).toBe(true);
    expect(textUsesAsset('{"imageUrl":"https://x.com/other.jpg"}', "abc123")).toBe(false);
  });
});
