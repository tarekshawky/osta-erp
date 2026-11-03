import { describe, it, expect } from "vitest";
import { securityHeaders } from "./securityHeaders";

describe("admin security headers", () => {
  const h = securityHeaders();
  const get = (k: string) => h.find((x) => x.key === k)?.value ?? "";
  it("stops other sites framing the admin, plug-ins and injected <base> tags, and content-type sniffing", () => {
    expect(get("Content-Security-Policy")).toBe("object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
  it("does not restrict scripts or device features the admin needs", () => {
    expect(get("Content-Security-Policy")).not.toMatch(/script-src|default-src/);
    expect(h.some((x) => x.key === "Permissions-Policy")).toBe(false);
  });
});
