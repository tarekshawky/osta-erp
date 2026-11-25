import { describe, expect, it } from "vitest";
import { addNode, blankNode, canIndent, countNodes, depthOf, duplicateNode, findNode, fixIssue, indentNode, linkState, menuIssues, moveSibling, outdentNode, pathTo, removeNode, toInput, toNodes, typeOf, updateNode, type KnownLinks, type MenuNode } from "./menuModel";
import { AREAS_MENU_URL, SERVICES_MENU_URL, menuProblem } from "./siteRules";

const n = (labelEn: string, url: string, children: MenuNode[] = [], extra: Partial<MenuNode> = {}) => blankNode({ uid: labelEn + url, labelEn, labelAr: "ع " + labelEn, url, children, ...extra });
const known: KnownLinks = { live: new Set(["/", "/pricing", "/about", "/amc", "/services"]), drafts: new Set(["/hidden"]), prefixes: ["/orders/"] };
const names = (t: MenuNode[]): unknown[] => t.map((x) => (x.children.length ? [x.labelEn, names(x.children)] : x.labelEn));

describe("editing the tree", () => {
  const tree = [n("A", "/", [n("A1", "/pricing"), n("A2", "/about", [n("A2a", "/amc")])]), n("B", "/services")];
  it("finds items at any depth and the path to them", () => {
    expect(findNode(tree, "A2a/amc")).toMatchObject({ depth: 3, index: 0 });
    expect(pathTo(tree, "A2a/amc")).toEqual(["A/", "A2/about", "A2a/amc"]);
    expect(pathTo(tree, "nope")).toEqual([]);
  });
  it("updates and removes without touching the original", () => {
    expect(findNode(updateNode(tree, "A2a/amc", { labelEn: "New" }), "A2a/amc")!.node.labelEn).toBe("New");
    expect(names(removeNode(tree, "A2/about"))).toEqual([["A", ["A1"]], "B"]);
    expect(names(tree)).toEqual([["A", ["A1", ["A2", ["A2a"]]]], "B"]);
  });
  it("duplicates an item with its sub-items, next to it, with new ids", () => {
    const { tree: t, uid } = duplicateNode(tree, "A2/about");
    expect(names(t)).toEqual([["A", ["A1", ["A2", ["A2a"]], ["A2", ["A2a"]]]], "B"]);
    expect(uid).not.toBe("A2/about");
    expect(countNodes(t)).toBe(countNodes(tree) + 2);
  });
  it("adds at the top or under a parent", () => {
    expect(names(addNode(tree, n("C", "/amc")))).toContain("C");
    expect(names(addNode(tree, n("C", "/amc"), "B/services"))).toContainEqual(["B", ["C"]]);
  });
  it("reorders only among siblings", () => {
    expect(names(moveSibling(tree, "B/services", "A/"))).toEqual(["B", ["A", ["A1", ["A2", ["A2a"]]]]]);
    expect(names(moveSibling(tree, "A2/about", "A1/pricing"))).toEqual([["A", [["A2", ["A2a"]], "A1"]], "B"]);
    expect(names(moveSibling(tree, "A1/pricing", "B/services"))).toEqual(names(tree));
  });
  it("indents under the item above and outdents after the parent, never past three levels", () => {
    expect(names(indentNode(tree, "A2/about"))).toEqual(names(tree)); // A2 has a child: indenting would make four levels
    expect(canIndent(tree, "A2/about")).toBe(false);
    expect(canIndent(tree, "A/")).toBe(false); // nothing above it
    expect(names(indentNode([n("X", "/"), n("Y", "/about")], "Y/about"))).toEqual([["X", ["Y"]]]);
    expect(names(outdentNode(tree, "A2/about"))).toEqual([["A", ["A1"]], ["A2", ["A2a"]], "B"]);
    expect(depthOf(tree)).toBe(3);
  });
});

describe("item types", () => {
  const pages = new Set(["/about"]);
  it("tells pages, links, dropdown headings, buttons and auto lists apart", () => {
    expect(typeOf(n("a", "/about"), pages)).toBe("page");
    expect(typeOf(n("a", "https://wa.me/1"), pages)).toBe("link");
    expect(typeOf(n("a", "", [n("b", "/about")]), pages)).toBe("heading");
    expect(typeOf(n("a", "/about", [], { style: "button" }), pages)).toBe("button");
    expect(typeOf(n("a", AREAS_MENU_URL), pages)).toBe("auto");
    expect(typeOf(n("a", SERVICES_MENU_URL), pages)).toBe("auto");
    expect(typeOf(n("a", "", [], { pick: "link" }), pages)).toBe("link");
    expect(typeOf(n("a", "/about", [], { pick: "link" }), pages)).toBe("link");
  });
});

describe("menu health", () => {
  it("flags the same item listed twice, but not a parent and sub-item that share an address under different names", () => {
    const tree = [n("Pricing", "/pricing", [n("Services Pricing", "/pricing"), n("AMC", "/amc"), { ...n("AMC", "/amc"), uid: "copy" }])];
    const dup = menuIssues(tree, known).filter((i) => i.kind === "duplicate");
    expect(dup).toHaveLength(1);
    expect(dup[0]).toMatchObject({ uid: "copy", twin: "AMC/amc" });
    expect(names(fixIssue(tree, dup[0]))).toEqual([["Pricing", ["Services Pricing", "AMC"]]]);
  });
  it("flags two side-by-side items with one address even when their names differ", () => {
    expect(menuIssues([n("One", "/about"), n("Two", "/about/")], known).filter((i) => i.kind === "duplicate")).toHaveLength(1);
  });
  it("does not confuse the two auto lists with each other, or with the page of the same name", () => {
    const tree = [n("Services", "/services"), n("Areas We Cover", AREAS_MENU_URL), n("Services", SERVICES_MENU_URL)];
    expect(menuIssues(tree, known).filter((i) => i.kind === "duplicate")).toEqual([]);
    expect(menuIssues([n("A", AREAS_MENU_URL), { ...n("A", AREAS_MENU_URL), uid: "again" }], known).filter((i) => i.kind === "duplicate")).toHaveLength(1);
  });
  it("keeps the sub-items of a removed copy", () => {
    const tree = [n("M", "/amc", [n("x", "/about")]), { ...n("M", "/amc", [n("x", "/about"), n("y", "/pricing")]), uid: "second" }];
    const dup = menuIssues(tree, known).find((i) => i.kind === "duplicate" && i.uid === "second")!;
    expect(names(fixIssue(tree, dup))[0]).toEqual(["M", ["x", "y"]]);
  });
  it("checks internal links, and leaves other websites, phones and auto lists alone", () => {
    expect(linkState("/about", known)).toBe("ok");
    expect(linkState("/about/?x=1#y", known)).toBe("ok");
    expect(linkState("/orders/new", known)).toBe("ok");
    expect(linkState("/nope", known)).toBe("broken");
    expect(linkState("/hidden", known)).toBe("draft");
    expect(linkState("//evil.com", known)).toBe("broken");
    expect(linkState("javascript:alert(1)", known)).toBe("broken");
    for (const u of ["https://x.com", "tel:+9715", "mailto:a@b.c", AREAS_MENU_URL, SERVICES_MENU_URL, ""]) expect(linkState(u, known)).toBe("ok");
    expect(menuIssues([n("Gone", "/nope")], known)[0]).toMatchObject({ kind: "broken" });
  });
  it("flags more than three levels and the fix lifts the item up", () => {
    const tree = [n("1", "/", [n("2", "/pricing", [n("3", "/about", [n("4", "/amc")])])])];
    const deep = menuIssues(tree, known).find((i) => i.kind === "depth")!;
    expect(deep.uid).toBe("4/amc");
    expect(depthOf(fixIssue(tree, deep))).toBe(3);
  });
  it("flags missing names and links, and a healthy menu has no issues", () => {
    expect(menuIssues([blankNode({ uid: "e" })], known).map((i) => i.kind)).toEqual(["incomplete"]);
    expect(menuIssues([n("Heading", "", [n("Kid", "/about")]), n("Areas", AREAS_MENU_URL, [], {})], known).filter((i) => i.kind !== "incomplete")).toEqual([]);
  });
});

describe("saving", () => {
  it("round-trips badges and buttons and drops editor-only data", () => {
    const input = toInput(toNodes([{ labelEn: "Book", labelAr: "احجز", url: "/pricing", visible: true, showDesktop: true, showMobile: false, newTab: false, style: "button", badgeEn: "New", badgeAr: "جديد", children: [] }]));
    expect(input[0]).toEqual({ labelEn: "Book", labelAr: "احجز", url: "/pricing", visible: true, showDesktop: true, showMobile: false, newTab: false, style: "button", badgeEn: "New", badgeAr: "جديد", children: [] });
    expect(menuProblem(input)).toBeNull();
  });
  it("accepts old data without badges", () => {
    expect(toNodes([{ labelEn: "a", labelAr: "ا", url: "/", visible: true, showDesktop: true, showMobile: true, newTab: false, children: [] }])[0]).toMatchObject({ style: "link", badgeEn: "", badgeAr: "" });
  });
  it("rejects a half-filled or too long badge, a button without a link, and a nested auto list", () => {
    const base = { labelEn: "a", labelAr: "ا", url: "/", visible: true, showDesktop: true, showMobile: true, newTab: false, children: [] };
    expect(menuProblem([{ ...base, badgeEn: "New" }])).toMatch(/both/);
    expect(menuProblem([{ ...base, badgeEn: "x".repeat(21), badgeAr: "ص" }])).toMatch(/at most 20/);
    expect(menuProblem([{ ...base, url: "", style: "button" }])).toMatch(/needs a link/);
    expect(menuProblem([{ ...base, style: "weird" }])).toMatch(/Unknown item type/);
    expect(menuProblem([{ ...base, children: [{ ...base, url: SERVICES_MENU_URL }] }])).toMatch(/top-level/);
    expect(menuProblem([{ ...base, url: SERVICES_MENU_URL }])).toBeNull();
  });
});
