import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { visibleNav } from "@/lib/adminNav";
import { WORKSPACES, isControlCenterPath, searchCommands, visibleWorkspaces, whereAmI } from "./workspaces";
import { attentionItems, attentionSummary, dayLabel, greeting, percent, type AttentionCounts } from "./dashboard";

const tabs = WORKSPACES.flatMap((w) => w.tabs.map((t) => t.href));
const all = visibleWorkspaces([], true);
const groups = visibleNav([], true).groups;

describe("Control Center workspaces", () => {
  it("lists only screens that exist, each once", () => {
    for (const href of tabs) expect(existsSync(join("src/app", href, "page.tsx")), href).toBe(true);
    expect(new Set(tabs).size).toBe(tabs.length);
  });
  it("still reaches every website screen the old tab bar led to", () => {
    const screens = readdirSync("src/app/admin/website", { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(`src/app/admin/website/${d.name}/page.tsx`)).map((d) => `/admin/website/${d.name}`);
    expect(screens.filter((s) => !tabs.includes(s))).toEqual([]);
    expect(tabs).toContain("/admin/website");
  });
  it("takes over website screens and their sub-screens, and leaves the rest of the ERP alone", () => {
    for (const p of ["/admin/website", "/admin/website/pages/abc", "/admin/blog/new", "/admin/legal/x/edit"]) expect(isControlCenterPath(p), p).toBe(true);
    for (const p of ["/admin", "/admin/invoices", "/admin/settings", "/admin/blogger", "/admin/websites"]) expect(isControlCenterPath(p), p).toBe(false);
  });
  it("knows where you are", () => {
    expect(whereAmI(all, "/admin/website")?.workspace.id).toBe("dashboard");
    expect(whereAmI(all, "/admin/website/pages/abc")?.tab.label).toBe("Pages");
    expect(whereAmI(all, "/admin/blog/categories")?.tab.label).toBe("Blog categories");
    expect(whereAmI(all, "/admin/blog/abc")?.tab.label).toBe("Blog");
    expect(whereAmI(all, "/admin/invoices")).toBeNull();
  });
  it("shows a limited admin only their own screens", () => {
    const mine = visibleWorkspaces(["/admin", "/admin/blog"], false);
    expect(mine.map((w) => w.id)).toEqual(["content"]);
    expect(mine[0].tabs.map((t) => t.href)).toEqual(["/admin/blog", "/admin/blog/categories"]);
  });
});

describe("Control Center search", () => {
  it("offers one line per workspace before anything is typed", () => {
    expect(searchCommands(all, groups, "")).toHaveLength(all.length);
  });
  it("finds screens by name or keyword, in either language", () => {
    expect(searchCommands(all, groups, "redirects")[0]).toMatchObject({ title: "SEO Center › Redirects & sitemap", href: "/admin/website/redirects" });
    expect(searchCommands(all, groups, "llms.txt")[0].href).toBe("/admin/website/technical");
    expect(searchCommands(all, groups, "منيو")[0].href).toBe("/admin/website/menus");
  });
  it("matches from the start of a word, and lists website pages before the rest of the ERP", () => {
    expect(searchCommands(all, groups, "ac").map((c) => c.title)).not.toContain("System › Backup");
    expect(searchCommands(all, groups, "ac").map((c) => c.title)).not.toContain("SEO Center › Backlinks");
    const page = { href: "/admin/website/pages/p1", title: "Pages › AC repair", hint: "/ac-repair", workspace: null };
    const found = searchCommands(all, groups, "contract", [page]);
    expect(found.findIndex((c) => c.href === page.href)).toBeLessThan(found.findIndex((c) => c.href === "/admin/contracts"));
  });
  it("also finds ERP pages, without repeating a website screen", () => {
    expect(searchCommands(all, groups, "invoices").some((c) => c.href === "/admin/invoices")).toBe(true);
    const found = searchCommands(all, groups, "blog", [], 20).map((c) => c.href);
    expect(new Set(found).size).toBe(found.length);
  });
  it("does not offer pages the admin may not open", () => {
    const sections = ["/admin/blog"];
    const found = searchCommands(visibleWorkspaces(sections, false), visibleNav(sections, false).groups, "invoices");
    expect(found).toEqual([]);
  });
});

describe("Control Center home", () => {
  const none: AttentionCounts = { newLeads: 0, ga4AndGtm: false, brokenLinks: 0, pagesWithoutTitle: 0, pagesWithoutDescription: 0, imagesWithoutAlt: 0 };
  it("lists only real problems, most urgent first", () => {
    expect(attentionItems(none)).toEqual([]);
    expect(attentionItems({ ...none, imagesWithoutAlt: 3, newLeads: 1, pagesWithoutTitle: 806 }).map((i) => i.kind)).toEqual(["leads", "title", "alt"]);
    expect(attentionItems({ ...none, newLeads: 1 })[0].title).toBe("1 new form submission");
    expect(attentionItems({ ...none, pagesWithoutTitle: 806 })[0].title).toBe("806 pages have no SEO title");
  });
  it("counts the things in words that fit", () => {
    expect(attentionSummary(0)).toBe("Nothing needs you right now.");
    expect(attentionSummary(1)).toBe("1 thing needs you today.");
    expect(attentionSummary(3)).toBe("3 things need you today.");
  });
  it("never rounds up to 100%, and has no figure for nothing", () => {
    expect(percent(805, 806)).toBe(99);
    expect(percent(806, 806)).toBe(100);
    expect(percent(0, 0)).toBeNull();
  });
  it("greets and dates by UAE time", () => {
    expect(greeting(new Date("2026-11-26T05:00:00Z"))).toBe("Good morning"); // 09:00 in Dubai
    expect(greeting(new Date("2026-11-26T09:00:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-11-26T20:30:00Z"))).toBe("Good morning"); // already after midnight
    expect(dayLabel(new Date("2026-11-25T21:00:00Z"), new Date("2026-11-26T10:00:00Z"))).toBe("Today");
    expect(dayLabel(new Date("2026-11-21T10:00:00Z"), new Date("2026-11-26T10:00:00Z"))).toBe("21 Nov");
  });
});
