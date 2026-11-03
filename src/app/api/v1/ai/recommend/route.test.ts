import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  services: vi.fn(),
  parse: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { aiFinderLog: { count: db.count, create: db.create }, bookableService: { findMany: db.services } } }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { parse: db.parse }; } }));
import { POST } from "./route";
import { NextRequest } from "next/server";

const req = (body: unknown, ip = "1.2.3.4") =>
  new NextRequest("http://x/api/v1/ai/recommend", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "x-forwarded-for": ip } });

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.AI_FINDER_DAILY_CAP;
  db.count.mockReset().mockResolvedValue(0);
  db.create.mockReset().mockResolvedValue({});
  db.services.mockReset().mockResolvedValue([
    { slug: "gas-refill", nameEn: "AC Gas Refilling", nameAr: "تعبئة غاز", catalogService: { categories: [{ category: { nameEn: "AC Services", sortOrder: 1, active: true } }] } },
    { slug: "hidden", nameEn: "Hidden", nameAr: "x", catalogService: { categories: [{ category: { nameEn: "Old", sortOrder: 1, active: false } }] } },
  ]);
  db.parse.mockReset().mockResolvedValue({ parsed_output: { matches: [{ id: 1, reason: "Low gas." }, { id: 50, reason: "x" }], note: "" }, stop_reason: "end_turn" });
});
afterEach(() => { delete process.env.ANTHROPIC_API_KEY; });

const json = async (r: Response) => (await r.json()) as { data?: { matches: { bookSlug: string; nameAr: string; category: string; reason: string }[]; note: string }; error?: { code: string } };

describe("POST /api/v1/ai/recommend", () => {
  it("is unavailable (and calls nothing) without a key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await POST(req({ text: "AC not cooling" }));
    expect(r.status).toBe(503);
    expect((await json(r)).error?.code).toBe("ai_unavailable");
    expect(db.parse).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });
  it("refuses bad input", async () => {
    expect((await POST(req("not json"))).status).toBe(400);
    expect((await POST(req({ text: "hi" }))).status).toBe(400);
    expect((await POST(req({ text: "x".repeat(401) }))).status).toBe(400);
    expect((await POST(req({ text: "a".repeat(5000) }))).status).toBe(413);
    expect(db.parse).not.toHaveBeenCalled();
  });
  it("returns the matching services (real ones only) with their names, and counts the request", async () => {
    const r = await POST(req({ text: "my AC is not cooling", lang: "ar" }));
    expect(r.status).toBe(200);
    const body = await json(r);
    expect(body.data?.matches).toEqual([{ bookSlug: "gas-refill", nameEn: "AC Gas Refilling", nameAr: "تعبئة غاز", category: "AC Services", reason: "Low gas." }]);
    expect(db.create).toHaveBeenCalledTimes(1);
    const args = db.parse.mock.calls[0][0];
    expect(args.system[0].text).toContain("1 | AC Gas Refilling");
    expect(args.system[0].text).not.toContain("hidden"); // a service of a hidden category is never offered
    expect(args.messages[0].content).toContain("<language>ar</language>");
  });
  it("limits one visitor, then the whole site", async () => {
    db.count.mockResolvedValueOnce(6).mockResolvedValueOnce(10);
    expect((await POST(req({ text: "AC not cooling" }))).status).toBe(429);
    db.count.mockResolvedValueOnce(0).mockResolvedValueOnce(300);
    const r = await POST(req({ text: "AC not cooling" }));
    expect(r.status).toBe(503);
    expect(db.parse).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });
  it("answers 'unavailable' (not an error page) when the AI service fails", async () => {
    db.parse.mockRejectedValueOnce(new Error("overloaded"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await POST(req({ text: "AC not cooling" }));
    expect(r.status).toBe(503);
    expect((await json(r)).error?.code).toBe("ai_unavailable");
    spy.mockRestore();
  });
});
