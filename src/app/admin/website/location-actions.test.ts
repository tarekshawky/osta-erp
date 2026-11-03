import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  guard: vi.fn(), audit: vi.fn(), revalidateSite: vi.fn(),
  area: vi.fn(), branchFind: vi.fn(), branchCreate: vi.fn(), branchUpdate: vi.fn(), branchDelete: vi.fn(), categoryCount: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/adminGuard", () => ({ guardPermission: m.guard, writeAudit: m.audit }));
vi.mock("@/lib/cms/publish", () => ({ revalidateSite: m.revalidateSite }));
vi.mock("@/lib/prisma", () => ({ prisma: { serviceArea: { findUnique: m.area }, catalogCategory: { count: m.categoryCount }, branch: { findUnique: m.branchFind, create: m.branchCreate, update: m.branchUpdate, delete: m.branchDelete } } }));
import { deleteBranch, saveBranch } from "./location-actions";
import type { BranchInputValue } from "@/lib/locations/locations";

const input: BranchInputValue = {
  slug: "ajman", areaId: "a1", nameEn: "Osta Services Ajman", nameAr: "خدمات آسطا عجمان", branchNameEn: "Ajman Branch", branchNameAr: "", regionEn: "",
  streetEn: "Paradise Lake Tower B9", streetAr: "", localityEn: "Emirates City", localityAr: "", postalCode: "", addressEn: "", addressAr: "",
  latitude: 25.3925699, longitude: 55.5760205, mapsUrl: "https://www.google.com/maps?cid=1", mapsEmbedUrl: "", appleMapsUrl: "", businessProfileUrl: "", reviewsUrl: "",
  phone: "+971568676036", whatsapp: "", email: "", hours: [], images: [], ratingValue: 5, ratingCount: 206, coverage: [], faqs: [], categoryIds: ["c1", "c2"], active: true, sortOrder: 0,
};

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.guard.mockResolvedValue({ ok: true, admin: { id: "e1", name: "Admin" } });
  m.area.mockResolvedValue({ id: "a1" });
  m.branchFind.mockResolvedValue(null);
  m.categoryCount.mockResolvedValue(2);
  m.branchCreate.mockResolvedValue({ id: "b1" });
  m.branchUpdate.mockResolvedValue({ id: "b1" });
  m.revalidateSite.mockResolvedValue(undefined);
});

describe("saveBranch", () => {
  it("creates a branch, connects its categories, writes an audit entry and refreshes the public site", async () => {
    const r = await saveBranch(null, input);
    expect(r).toEqual({ ok: true, id: "b1" });
    const data = m.branchCreate.mock.calls[0][0].data;
    expect(data.slug).toBe("ajman");
    expect(data.categories).toEqual({ connect: [{ id: "c1" }, { id: "c2" }] });
    expect(data.categoryIds).toBeUndefined();
    expect(m.audit).toHaveBeenCalledWith(expect.anything(), "branch.create", "Branch", "b1", null, expect.objectContaining({ slug: "ajman" }));
    expect(m.revalidateSite).toHaveBeenCalled();
  });
  it("updates an existing branch and replaces its categories", async () => {
    m.categoryCount.mockResolvedValue(1);
    m.branchFind.mockResolvedValueOnce({ id: "b1" }).mockResolvedValueOnce({ slug: "ajman", nameEn: "x", active: true, latitude: 1, longitude: 2 });
    const r = await saveBranch("b1", { ...input, categoryIds: ["c1"] });
    expect(r).toEqual({ ok: true, id: "b1" });
    expect(m.branchCreate).not.toHaveBeenCalled();
    expect(m.branchUpdate.mock.calls[0][0].where).toEqual({ id: "b1" });
    expect(m.branchUpdate.mock.calls[0][0].data.categories).toEqual({ set: [{ id: "c1" }] });
    expect(m.audit).toHaveBeenCalledWith(expect.anything(), "branch.update", "Branch", "b1", expect.objectContaining({ slug: "ajman" }), expect.anything());
  });
  it("refuses a user without permission and writes nothing", async () => {
    m.guard.mockResolvedValue({ ok: false, error: "No permission" });
    expect(await saveBranch(null, input)).toEqual({ ok: false, error: "No permission" });
    expect(m.branchCreate).not.toHaveBeenCalled();
  });
  it("refuses wrong coordinates, a non-map link, bad hours and a duplicate code, with a clear message", async () => {
    expect((await saveBranch(null, { ...input, latitude: 55.57, longitude: 25.39 })).error).toMatch(/inside the UAE/);
    expect((await saveBranch(null, { ...input, mapsUrl: "https://evil.example/x" })).error).toMatch(/Google Maps link/);
    expect((await saveBranch(null, { ...input, hours: [{ days: [1], opens: "18:00", closes: "10:00" }] })).error).toMatch(/after opening/);
    m.branchFind.mockResolvedValueOnce({ id: "other" });
    expect((await saveBranch(null, input)).error).toMatch(/already exists/);
    expect(m.branchCreate).not.toHaveBeenCalled();
  });
  it("refuses an unknown emirate or category", async () => {
    m.area.mockResolvedValueOnce(null);
    expect((await saveBranch(null, input)).error).toMatch(/emirate/);
    m.categoryCount.mockResolvedValueOnce(1);
    expect((await saveBranch(null, input)).error).toMatch(/categories no longer exists/);
  });
});

describe("deleteBranch", () => {
  it("deletes, audits and refreshes", async () => {
    m.branchFind.mockResolvedValueOnce({ slug: "ajman", nameEn: "Osta Services Ajman" });
    expect((await deleteBranch("b1")).ok).toBe(true);
    expect(m.branchDelete).toHaveBeenCalledWith({ where: { id: "b1" } });
    expect(m.audit).toHaveBeenCalledWith(expect.anything(), "branch.delete", "Branch", "b1", expect.anything(), null);
    expect(m.revalidateSite).toHaveBeenCalled();
  });
  it("says so when the branch is gone", async () => {
    expect((await deleteBranch("nope")).error).toMatch(/not found/);
  });
});
