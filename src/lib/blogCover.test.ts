import { describe, it, expect } from "vitest";
import { parseImageDataUri, publicCoverUrl } from "./blogCover";

const png = "data:image/png;base64,iVBORw0KGgo=";
describe("blog cover URLs", () => {
  it("turns an inline image into a public URL", () => {
    const u = publicCoverUrl("https://admin.test", "my-post", png)!;
    expect(u).toMatch(/^https:\/\/admin\.test\/api\/blog-cover\/my-post\?v=[0-9a-f]{10}$/);
  });
  it("the URL changes when the image changes", () => {
    expect(publicCoverUrl("https://a", "p", png)).not.toBe(publicCoverUrl("https://a", "p", png.replace("iVBOR", "iVBOS")));
  });
  it("leaves normal URLs alone and ignores empty values", () => {
    expect(publicCoverUrl("https://a", "p", "https://cdn.test/x.jpg")).toBe("https://cdn.test/x.jpg");
    expect(publicCoverUrl("https://a", "p", null)).toBeNull();
  });
  it("refuses non-image or malformed data", () => {
    expect(parseImageDataUri("data:text/html;base64,PGI+")).toBeNull();
    expect(publicCoverUrl("https://a", "p", "data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(parseImageDataUri(png)?.mime).toBe("image/png");
  });
});
