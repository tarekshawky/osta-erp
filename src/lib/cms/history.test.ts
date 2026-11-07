import { describe, it, expect } from "vitest";
import { MAX_STEPS, blocksStructureChanged, emptyHistory, recordChange, redo, undo } from "./history";

describe("editor history", () => {
  it("undo and redo walk back and forward", () => {
    let h = emptyHistory<string>();
    h = recordChange(h, "a", 1000, true); // a -> b
    h = recordChange(h, "b", 5000, true); // b -> c
    const u1 = undo(h, "c")!;
    expect(u1.value).toBe("b");
    const u2 = undo(u1.history, "b")!;
    expect(u2.value).toBe("a");
    expect(undo(u2.history, "a")).toBeNull();
    const r1 = redo(u2.history, "a")!;
    expect(r1.value).toBe("b");
    expect(redo(r1.history, "b")!.value).toBe("c");
  });
  it("a burst of quick edits is one step, a pause starts a new one", () => {
    let h = emptyHistory<string>();
    h = recordChange(h, "", 1000, false); // first edit always opens a step
    h = recordChange(h, "H", 1200, false);
    h = recordChange(h, "He", 1400, false);
    expect(h.past).toEqual([""]);
    h = recordChange(h, "Hel", 4000, false);
    expect(h.past).toEqual(["", "Hel"]);
  });
  it("structural changes always get their own step", () => {
    let h = emptyHistory<string>();
    h = recordChange(h, "x", 1000, false);
    h = recordChange(h, "y", 1100, true);
    expect(h.past).toEqual(["x", "y"]);
  });
  it("a new edit clears what could be redone, and is not merged into an undone step", () => {
    let h = emptyHistory<string>();
    h = recordChange(h, "a", 1000, true);
    h = recordChange(h, "b", 3000, true);
    const u = undo(h, "c")!;
    expect(u.history.future).toEqual(["c"]);
    const after = recordChange(u.history, "b", 3100, false);
    expect(after.future).toEqual([]);
    expect(after.past).toEqual(["a", "b"]);
  });
  it("keeps at most MAX_STEPS steps", () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < MAX_STEPS + 20; i++) h = recordChange(h, i, i * 10_000, true);
    expect(h.past).toHaveLength(MAX_STEPS);
    expect(h.past[h.past.length - 1]).toBe(MAX_STEPS + 19);
  });
  it("detects added, removed and reordered blocks", () => {
    const a = [{ id: "1" }, { id: "2" }];
    expect(blocksStructureChanged(a, [{ id: "1" }, { id: "2" }])).toBe(false);
    expect(blocksStructureChanged(a, [{ id: "2" }, { id: "1" }])).toBe(true);
    expect(blocksStructureChanged(a, [{ id: "1" }])).toBe(true);
    expect(blocksStructureChanged(a, [...a, { id: "3" }])).toBe(true);
  });
});
