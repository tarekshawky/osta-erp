import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { PhotoError, createUploadToken, processWorkPhoto, sniffImageMime, verifyUploadToken } from "./photos";

const png = (w = 300, h = 200) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 30, b: 30 } } }).png().toBuffer();
const jpg = (w = 300, h = 200) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 20, g: 120, b: 200 } } }).jpeg().toBuffer();

describe("sniffImageMime", () => {
  it("recognises JPEG, PNG and WebP by their real bytes", async () => {
    expect(sniffImageMime(await jpg())).toBe("image/jpeg");
    expect(sniffImageMime(await png())).toBe("image/png");
    expect(sniffImageMime(await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).webp().toBuffer())).toBe("image/webp");
  });
  it("rejects a Windows program, a script and a GIF even if they were renamed .jpg", () => {
    expect(sniffImageMime(Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff", "binary"))).toBeNull();
    expect(sniffImageMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageMime(Buffer.from("GIF89a\x01\x00\x01\x00", "binary"))).toBeNull();
    expect(sniffImageMime(new Uint8Array())).toBeNull();
  });
});

describe("processWorkPhoto", () => {
  it("re-encodes to WebP, limits the size to 2000px and makes a thumbnail", async () => {
    const big = await jpg(4000, 3000);
    const r = await processWorkPhoto(big, 8 * 1024 * 1024);
    expect(r.mimeType).toBe("image/webp");
    expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(2000);
    expect(sniffImageMime(r.data)).toBe("image/webp");
    expect((await sharp(r.thumb).metadata()).width).toBeLessThanOrEqual(320);
  });
  it("removes EXIF/GPS metadata", async () => {
    const withExif = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#888" } }).jpeg().withExif({ IFD0: { Copyright: "secret-gps-owner" } }).toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const r = await processWorkPhoto(withExif, 8 * 1024 * 1024);
    expect((await sharp(r.data).metadata()).exif).toBeUndefined();
    expect(r.data.toString("latin1")).not.toContain("secret-gps-owner");
  });
  it("rejects empty, too large, wrong-type and corrupt files", async () => {
    await expect(processWorkPhoto(Buffer.alloc(0), 1000)).rejects.toMatchObject({ code: "empty" });
    await expect(processWorkPhoto(await png(), 100)).rejects.toMatchObject({ code: "too_large" });
    await expect(processWorkPhoto(Buffer.from("MZ not an image at all"), 1_000_000)).rejects.toBeInstanceOf(PhotoError);
    const truncated = (await jpg()).subarray(0, 40);
    await expect(processWorkPhoto(truncated, 1_000_000)).rejects.toMatchObject({ code: "unreadable" });
  });
});

describe("upload tokens", () => {
  it("is valid only for its own job and before it expires", () => {
    const t = createUploadToken("abc123", "job1", 1000);
    expect(verifyUploadToken(t, "job1", 2000)).toBe("abc123");
    expect(verifyUploadToken(t, "job2", 2000)).toBeNull();
    expect(verifyUploadToken(t, "job1", 1000 + 4 * 3600 * 1000)).toBeNull();
    expect(verifyUploadToken(t.slice(0, -2) + "xx", "job1", 2000)).toBeNull();
    expect(verifyUploadToken("garbage", "job1")).toBeNull();
  });
});
