import { describe, expect, it } from "vitest";
import { applyMove, canIndent, changedRows, descendantIds, flatten, getProjection, indent, layoutProblem, moveDown, moveUp, nextSortOrder, normalize, outdent, parentOptions } from "./pageTree";

type P = { id: string; parentId: string | null; sortOrder: number; titleEn: string };
const p = (id: string, parentId: string | null, sortOrder: number): P => ({ id, parentId, sortOrder, titleEn: id.toUpperCase() });
// home
// services -> ac-repair, ac-clean
// locations -> ajman
const sample = (): P[] => [p("home", null, 0), p("services", null, 1), p("ac-repair", "services", 0), p("ac-clean", "services", 1), p("locations", null, 2), p("ajman", "locations", 0)];
const order = (items: P[]) => flatten(items).map((i) => `${"-".repeat(i.depth)}${i.id}`);

describe("flatten", () => {
  it("lists the tree depth first with depths", () => {
    expect(order(sample())).toEqual(["home", "services", "-ac-repair", "-ac-clean", "locations", "-ajman"]);
  });
  it("skips children of collapsed pages", () => {
    expect(flatten(sample(), new Set(["services"])).map((i) => i.id)).toEqual(["home", "services", "locations", "ajman"]);
  });
  it("shows an orphan (missing parent) at the top level and survives a cycle", () => {
    expect(order([p("a", "ghost", 0)])).toEqual(["a"]);
    expect(flatten([p("a", "b", 0), p("b", "a", 0)]).length).toBeLessThanOrEqual(2);
  });
  it("marks pages that have children", () => {
    expect(flatten(sample()).find((i) => i.id === "services")?.hasChildren).toBe(true);
    expect(flatten(sample()).find((i) => i.id === "home")?.hasChildren).toBe(false);
  });
});

describe("descendants and validation", () => {
  it("finds every page under a page", () => {
    expect([...descendantIds(sample(), "services")].sort()).toEqual(["ac-clean", "ac-repair"]);
  });
  it("accepts a valid layout", () => {
    expect(layoutProblem(sample(), [{ id: "ajman", parentId: "services", sortOrder: 2 }])).toBeNull();
  });
  it("refuses unknown pages, self parents and cycles", () => {
    expect(layoutProblem(sample(), [{ id: "nope", parentId: null, sortOrder: 0 }])).toMatch(/no longer exists/);
    expect(layoutProblem(sample(), [{ id: "home", parentId: "home", sortOrder: 0 }])).toMatch(/own parent/);
    expect(layoutProblem(sample(), [{ id: "services", parentId: "ac-repair", sortOrder: 0 }])).toMatch(/inside its own sub-page/);
    expect(layoutProblem(sample(), [{ id: "home", parentId: "ghost", sortOrder: 0 }])).toMatch(/parent page no longer exists/);
  });
  it("limits the depth", () => {
    const chain: P[] = Array.from({ length: 7 }, (_, i) => p(`n${i}`, i ? `n${i - 1}` : null, 0));
    expect(layoutProblem(chain, [])).toMatch(/at most 6 levels/);
  });
});

describe("button moves", () => {
  it("moves up and down among siblings", () => {
    expect(order(moveUp(sample(), "ac-clean"))).toEqual(["home", "services", "-ac-clean", "-ac-repair", "locations", "-ajman"]);
    expect(order(moveDown(sample(), "home"))).toEqual(["services", "-ac-repair", "-ac-clean", "home", "locations", "-ajman"]);
    expect(order(moveUp(sample(), "home"))).toEqual(order(sample()));
  });
  it("indents under the sibling above and outdents after the parent", () => {
    expect(order(indent(sample(), "locations"))).toEqual(["home", "services", "-ac-repair", "-ac-clean", "-locations", "--ajman"]);
    expect(order(outdent(sample(), "ac-repair"))).toEqual(["home", "services", "-ac-clean", "ac-repair", "locations", "-ajman"]);
    expect(canIndent(sample(), "home")).toBe(false);
    expect(canIndent(sample(), "services")).toBe(true);
  });
  it("keeps a page's own sub-pages with it when it moves out of a parent", () => {
    const indented = indent(sample(), "locations");
    expect(order(indented)).toEqual(["home", "services", "-ac-repair", "-ac-clean", "-locations", "--ajman"]);
    expect(order(outdent(indented, "locations"))).toEqual(["home", "services", "-ac-repair", "-ac-clean", "locations", "-ajman"]);
  });
  it("outdenting a top-level page changes nothing", () => {
    expect(order(outdent(sample(), "home"))).toEqual(order(sample()));
  });
});

describe("drag and drop", () => {
  const items = sample();
  it("projects a sideways drag into nesting", () => {
    const visible = flatten(items);
    // drag "locations" up over "ac-clean" (it lands above it, under ac-repair) and move right: becomes a child of ac-repair
    const proj = getProjection(visible, "locations", "ac-clean", 40, 20);
    expect(proj).toEqual({ depth: 2, parentId: "ac-repair" });
    // without sideways movement it stays among its siblings and cannot split services from its children
    expect(getProjection(visible, "locations", "ac-clean", 0, 20)).toEqual({ depth: 1, parentId: "services" });
  });
  it("moves a page and keeps its sub-pages", () => {
    const collapsed = new Set(["locations"]);
    const visible = flatten(items, collapsed).filter((i) => !descendantIds(items, "services").has(i.id));
    const proj = getProjection(visible, "services", "locations", 0, 20)!;
    expect(proj).toEqual({ depth: 0, parentId: null });
    const next = applyMove(items, collapsed, "services", "locations", proj);
    expect(order(next)).toEqual(["home", "locations", "-ajman", "services", "-ac-repair", "-ac-clean"]);
  });
  it("can drop a page into another parent", () => {
    const visible = flatten(items);
    const proj = getProjection(visible, "ajman", "ac-clean", 0, 20)!;
    expect(proj.parentId).toBe("services");
    const next = applyMove(items, new Set(), "ajman", "ac-clean", proj);
    expect(order(next)).toEqual(["home", "services", "-ac-repair", "-ajman", "-ac-clean", "locations"]);
  });
});

describe("saving", () => {
  it("returns only the rows that changed", () => {
    const before = sample();
    const after = moveUp(before, "ac-clean");
    expect(changedRows(before, after)).toEqual([
      { id: "ac-clean", parentId: "services", sortOrder: 0 },
      { id: "ac-repair", parentId: "services", sortOrder: 1 },
    ]);
    expect(changedRows(before, before)).toEqual([]);
  });
  it("normalizes positions", () => {
    const n = normalize([p("a", null, 5), p("b", null, 9), p("c", "a", 3)]);
    expect(n.map((x) => x.sortOrder)).toEqual([0, 1, 0]);
  });
  it("gives a new page the last position and offers parents in tree order", () => {
    expect(nextSortOrder(sample(), "services")).toBe(2);
    expect(nextSortOrder(sample(), "home")).toBe(0);
    expect(parentOptions(sample(), "services").map((o) => o.label)).toEqual(["HOME", "LOCATIONS", "— AJMAN"]);
  });
});
