import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ count: vi.fn(), create: vi.fn(), data: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { aiFinderLog: { count: db.count, create: db.create } } }));
vi.mock("@/lib/assistant/data", () => ({ assistantData: db.data }));
import { POST } from "./route";
import { NextRequest } from "next/server";

const req = (body: unknown) => new NextRequest("http://x/api/v1/assistant/ask", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "x-forwarded-for": "9.9.9.9" } });
const json = async (r: Response) => (await r.json()) as { data?: { answer: string; matches: { bookSlug: string }[]; links: { href: string }[]; suggestions: string[] }; error?: { code: string } };

beforeEach(() => {
  db.count.mockReset().mockResolvedValue(0);
  db.create.mockReset().mockResolvedValue({});
  db.data.mockReset().mockResolvedValue({
    regions: [{ slug: "dubai", nameEn: "Dubai", nameAr: "دبي" }],
    categories: [{ nameEn: "AC Services", nameAr: "خدمات التكييف" }],
    contact: { phone: "+971 50 000 0000", whatsapp: "971500000000", email: "hi@osta.test", hoursEn: "", hoursAr: "", addressEn: "", addressAr: "" },
    services: [{ slug: "ac-cleaning", nameEn: "AC Cleaning", nameAr: "تنظيف المكيف", category: "AC Services", categoryAr: "خدمات التكييف", price: { mode: "PRICED", unitEn: "per AC unit", unitAr: "للمكيف", byRegion: { dubai: 120 } } }],
  });
});

describe("POST /api/v1/assistant/ask", () => {
  it("answers from the site's own data, with no AI key needed", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await POST(req({ text: "how much is AC cleaning in Dubai", lang: "en" }));
    expect(r.status).toBe(200);
    const body = await json(r);
    expect(body.data?.answer).toContain("AC Cleaning: 120 AED per AC unit");
    expect(body.data?.matches[0].bookSlug).toBe("ac-cleaning");
    expect(body.data?.links[0].href).toBe("/pricing?service=ac-cleaning");
    expect(body.data?.suggestions.length).toBeGreaterThan(0);
    expect(db.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: "assistant" }) });
  });
  it("answers in Arabic", async () => {
    const body = await json(await POST(req({ text: "كم سعر تنظيف المكيف في دبي", lang: "ar" })));
    expect(body.data?.answer).toContain("تنظيف المكيف: 120 AED للمكيف");
  });
  it("refuses bad input", async () => {
    expect((await POST(req("nope"))).status).toBe(400);
    expect((await POST(req({ text: "" }))).status).toBe(400);
    expect((await POST(req({ text: "x".repeat(301) }))).status).toBe(400);
    expect((await POST(req({ text: "a".repeat(3000) }))).status).toBe(413);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("limits one visitor", async () => {
    db.count.mockResolvedValueOnce(30);
    const r = await POST(req({ text: "hello" }));
    expect(r.status).toBe(429);
    expect((await json(r)).error?.code).toBe("rate_limited");
    expect(db.create).not.toHaveBeenCalled();
  });
  it("says 'unavailable' (not an error page) when the data cannot be read", async () => {
    db.data.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await POST(req({ text: "hello" }));
    expect(r.status).toBe(503);
    spy.mockRestore();
  });
});
