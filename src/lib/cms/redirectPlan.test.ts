import { describe, expect, it } from "vitest";
import { planRedirect } from "./redirectPlan";

describe("planRedirect", () => {
  it("adds a redirect from the old address to the new one", () => {
    expect(planRedirect([], "/old", "/new")).toEqual({ upsert: [{ fromPath: "/old", toPath: "/new" }], remove: [] });
  });
  it("points earlier redirects straight at the newest address (no chains)", () => {
    const plan = planRedirect([{ fromPath: "/a", toPath: "/b" }], "/b", "/c");
    expect(plan.upsert).toContainEqual({ fromPath: "/a", toPath: "/c" });
    expect(plan.upsert).toContainEqual({ fromPath: "/b", toPath: "/c" });
  });
  it("removes a redirect that leaves the address a page now uses, and never loops", () => {
    const plan = planRedirect([{ fromPath: "/new", toPath: "/old" }], "/old", "/new");
    expect(plan.remove).toContain("/new");
    expect(plan.upsert).toEqual([{ fromPath: "/old", toPath: "/new" }]);
    const loop = planRedirect([{ fromPath: "/x", toPath: "/y" }], "/y", "/x");
    expect(loop.upsert.every((r) => r.fromPath !== r.toPath)).toBe(true);
    expect(loop.remove).toContain("/x");
  });
  it("does nothing when the address is unchanged", () => {
    expect(planRedirect([], "/same", "/same")).toEqual({ upsert: [], remove: [] });
  });
});
