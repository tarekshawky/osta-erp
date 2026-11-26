import { describe, expect, it } from "vitest";
import { buildMenuTree, menuLevels } from "./menuTree";

type Item = { name: string; children: Item[] };
const item = (name: string, children: Item[] = []): Item => ({ name, children });

describe("menuLevels", () => {
  const items = [item("a", [item("a1", [item("a1x")]), item("a2")]), item("b", [item("b1")])];
  let n = 0;
  const levels = menuLevels(items, (i, order) => ({ menu: "header", name: i.name, order }), () => `id${++n}`);

  it("gives one list per level, parents before their sub-items, numbered among their siblings", () => {
    expect(levels.map((l) => l.map((r) => `${r.name}:${r.order}`))).toEqual([["a:0", "b:1"], ["a1:0", "a2:1", "b1:0"], ["a1x:0"]]);
  });
  it("links every row to its parent, so reading the rows back gives the same tree", () => {
    const shape = (list: { name: string; children: unknown[] }[]): Item[] => list.map((t) => item(t.name, shape(t.children as never)));
    expect(shape(buildMenuTree(levels.flat(), "header", (r) => ({ name: r.name })))).toEqual(items);
  });
  it("makes a different id for every row of a very large menu", () => {
    const many = Array.from({ length: 600 }, (_, i) => item(`m${i}`, [item(`s${i}`)]));
    const rows = menuLevels(many, (i) => ({ name: i.name })).flat();
    expect(new Set(rows.map((r) => r.id)).size).toBe(1200);
  });
  it("is empty for an empty menu", () => expect(menuLevels([] as Item[], () => ({}))).toEqual([]));
});
