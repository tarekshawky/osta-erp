import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NAV_GROUPS } from "./adminNav";
import { SYSTEM_META, systemHome, getSystem } from "./adminSystems";
import { canAccessAdminSection } from "./adminSections";

describe("systems (the website's own sidebar groups)", () => {
  it("every sidebar group has a card text and colour, and nothing else is added", () => {
    expect(Object.keys(SYSTEM_META).sort()).toEqual(NAV_GROUPS.map((g) => g.id).sort());
  });
  it("each system overview address is served by the one route", () => {
    expect(existsSync(join(process.cwd(), "src/app/admin/systems/[system]/page.tsx"))).toBe(true);
    for (const g of NAV_GROUPS) expect(systemHome(g.id)).toBe(`/admin/systems/${g.id}`);
    expect(getSystem("nope")).toBeUndefined();
  });
  it("a restricted admin can reach a system overview (it checks for itself) but not other pages", () => {
    expect(canAccessAdminSection(["/admin/orders"], "/admin/systems/finance")).toBe(true);
    expect(canAccessAdminSection(["/admin/orders"], "/admin/invoices")).toBe(false);
  });
});
