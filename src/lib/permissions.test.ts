import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_DEFINITIONS, PERMISSIONS } from "./permissions";

const perms = (key: string) => ROLE_DEFINITIONS.find((r) => r.key === key)!.permissions as string[];

describe("hasPermission", () => {
  it("super admin can do everything, whatever role is set", () => {
    expect(hasPermission({ role: "SUPER_ADMIN" }, [], "pricing.edit")).toBe(true);
  });
  it("admin without an assigned role keeps full access (no lockout)", () => {
    expect(hasPermission({ role: "ADMIN" }, null, "integrations.manage")).toBe(true);
  });
  it("employees never pass admin permissions", () => {
    expect(hasPermission({ role: "EMPLOYEE" }, null, "orders.view")).toBe(false);
    expect(hasPermission({ role: "EMPLOYEE" }, [...PERMISSIONS], "orders.view")).toBe(false);
  });
  it("viewer is read-only", () => {
    const v = perms("VIEWER");
    expect(hasPermission({ role: "ADMIN" }, v, "orders.view")).toBe(true);
    expect(hasPermission({ role: "ADMIN" }, v, "orders.manage")).toBe(false);
    expect(hasPermission({ role: "ADMIN" }, v, "pricing.edit")).toBe(false);
  });
  it("editor can edit pages but not prices or SEO", () => {
    const e = perms("EDITOR");
    expect(hasPermission({ role: "ADMIN" }, e, "pages.edit")).toBe(true);
    expect(hasPermission({ role: "ADMIN" }, e, "pricing.edit")).toBe(false);
    expect(hasPermission({ role: "ADMIN" }, e, "seo.edit")).toBe(false);
  });
  it("operations handles orders and visit-fee review but not pricing", () => {
    const o = perms("OPERATIONS");
    expect(hasPermission({ role: "ADMIN" }, o, "visitFee.review")).toBe(true);
    expect(hasPermission({ role: "ADMIN" }, o, "pricing.edit")).toBe(false);
  });
  it("only the owner holds integrations.manage", () => {
    expect(perms("OWNER")).toContain("integrations.manage");
    for (const r of ROLE_DEFINITIONS.filter((x) => x.key !== "OWNER")) expect(r.permissions).not.toContain("integrations.manage");
  });
});
