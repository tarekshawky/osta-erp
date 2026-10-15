import { describe, it, expect } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DASHBOARD, NAV_GROUPS, leafAllowed, locate, searchNav, visibleNav } from "./adminNav";

// Every address in the menu must be a real page, so no link ever leads to "not found".
function pageExists(href: string): boolean {
  const path = href.split("?")[0].replace(/^\//, "");
  return existsSync(join(process.cwd(), "src/app", path, "page.tsx"));
}

describe("admin navigation", () => {
  const all = [DASHBOARD, ...NAV_GROUPS.flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]))];

  it("only links to pages that exist", () => {
    const missing = [...new Set(all.map((l) => l.href))].filter((h) => !pageExists(h));
    expect(missing).toEqual([]);
  });
  it("has the ten sections of the plan with unique ids", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Orders & Bookings", "HR & Employees", "Finance & Accounting", "Reports & Analytics", "Marketing & Blog",
      "Website Management", "Fleet & Vehicles", "Inventory & Services", "System Administration",
    ]);
    expect(new Set(NAV_GROUPS.map((g) => g.id)).size).toBe(NAV_GROUPS.length);
  });
  it("never lists the same page twice inside one module", () => {
    for (const g of NAV_GROUPS) expect(new Set(g.items.map((i) => i.href)).size).toBe(g.items.length);
  });
  it("shares pages between modules instead of copying them", () => {
    const where = (href: string) => NAV_GROUPS.filter((g) => g.items.some((i) => i.href === href)).map((g) => g.id);
    expect(where("/admin/work-reports")).toEqual(["orders", "reports"]);
    expect(where("/admin/vehicles/expense-report")).toEqual(["finance", "reports", "fleet"]);
    expect(where("/admin/blog/categories")).toEqual(["marketing", "website"]);
    expect(where("/admin/services")).toEqual(["website", "inventory"]);
  });
});

describe("permissions", () => {
  it("a super admin sees everything", () => {
    const v = visibleNav([], true);
    expect(v.dashboard).toBe(true);
    expect(v.groups).toHaveLength(NAV_GROUPS.length);
  });
  it("an admin with no restrictions sees everything", () => expect(visibleNav([], false).groups).toHaveLength(NAV_GROUPS.length));
  it("a restricted admin sees only the allowed pages, and modules that end up empty disappear", () => {
    const v = visibleNav(["/admin/orders", "/admin/customers", "/admin/employees"], false);
    expect(v.dashboard).toBe(false);
    expect(v.groups.map((g) => g.id)).toEqual(["orders", "hr"]);
    expect(v.groups[0].items.map((i) => i.label)).toEqual(["Service Orders", "Customers"]);
    expect(v.groups[1].items.map((i) => i.label)).toEqual(["Employees"]);
  });
  it("blog categories follow the Blog permission, expense report has its own", () => {
    expect(leafAllowed("/admin/blog/categories", ["/admin/blog"], false)).toBe(true);
    expect(leafAllowed("/admin/vehicles/expense-report", ["/admin/vehicles"], false)).toBe(false);
    expect(leafAllowed("/admin/website/code", ["/admin/website"], false)).toBe(true);
    expect(leafAllowed("/admin/website/code", ["/admin/orders"], false)).toBe(false);
  });
});

describe("current page and module", () => {
  it("picks the most specific page", () => {
    expect(locate(NAV_GROUPS, "/admin/blog/categories")).toMatchObject({ href: "/admin/blog/categories" });
    expect(locate(NAV_GROUPS, "/admin/blog/abc123/edit")).toMatchObject({ href: "/admin/blog" });
    expect(locate(NAV_GROUPS, "/admin/website/pages/xyz")).toMatchObject({ groupId: "website", href: "/admin/website/pages" });
    expect(locate(NAV_GROUPS, "/admin/website/forms")).toMatchObject({ href: "/admin/website" }); // a Website screen without its own entry
  });
  it("Dashboard only matches /admin itself", () => expect(locate(NAV_GROUPS, "/admin")).toBeNull());
  it("a page in several modules belongs to the one it was opened from", () => {
    expect(locate(NAV_GROUPS, "/admin/work-reports", "reports")?.groupId).toBe("reports");
    expect(locate(NAV_GROUPS, "/admin/work-reports", "orders")?.groupId).toBe("orders");
    expect(locate(NAV_GROUPS, "/admin/work-reports")?.groupId).toBe("orders"); // first module when unknown
    expect(locate(NAV_GROUPS, "/admin/work-reports", "hr")?.groupId).toBe("orders"); // remembered module doesn't contain it
  });
  it("inventory sub-pages keep Inventory current", () => expect(locate(NAV_GROUPS, "/admin/inventory/items/5")).toMatchObject({ groupId: "inventory", href: "/admin/inventory" }));
});

describe("search", () => {
  const groups = visibleNav([], true).groups;
  it("finds pages by name, module and keyword", () => {
    expect(searchNav(groups, "payroll")[0]).toMatchObject({ href: "/admin/payroll" });
    expect(searchNav(groups, "robots")[0]).toMatchObject({ href: "/admin/website/technical" });
    expect(searchNav(groups, "fleet").map((h) => h.href)).toContain("/admin/vehicles");
    expect(searchNav(groups, "stock adj")[0]).toMatchObject({ label: "Stock Adjustments" });
  });
  it("lists a shared page once and returns nothing for an empty or unknown query", () => {
    expect(searchNav(groups, "work reports").filter((h) => h.href === "/admin/work-reports")).toHaveLength(1);
    expect(searchNav(groups, "")).toEqual([]);
    expect(searchNav(groups, "zzzz nothing")).toEqual([]);
  });
  it("only searches pages the user may see", () => {
    const limited = visibleNav(["/admin/orders"], false).groups;
    expect(searchNav(limited, "payroll")).toEqual([]);
    expect(searchNav(limited, "orders")[0]).toMatchObject({ href: "/admin/orders" });
  });
});
void readdirSync; void statSync;
