import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ findPkg: vi.fn(), findGroup: vi.fn(), create: vi.fn(), count: vi.fn(), logCreate: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { maintenancePackage: { findFirst: db.findPkg }, maintenanceGroup: { findUnique: db.findGroup }, maintenanceSubscription: { create: db.create }, aiFinderLog: { count: db.count, create: db.logCreate } } }));
vi.mock("@/lib/emailSender", () => ({ notifyAdminOfMaintenanceSubscription: db.notify }));
import { POST } from "./route";

const good = { packageId: "p1", name: "Sara Ahmed", phone: "+971568676036", email: "sara@example.com", emirate: "Dubai", location: "Marina", propertyType: "Apartment", bedrooms: 2, acUnits: 3, activationDate: "" };
const req = (body: unknown) => new NextRequest("http://x/api/v1/maintenance-subscriptions", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": "8.8.8.8" } });
const code = async (r: Response) => ((await r.json()) as { error?: { code: string } }).error?.code;

beforeEach(() => {
  for (const m of Object.values(db)) m.mockReset();
  db.count.mockResolvedValue(0); db.logCreate.mockResolvedValue({}); db.notify.mockResolvedValue(undefined);
  db.findPkg.mockResolvedValue({ id: "p1", nameEn: "Gold Package", price: 1499 });
  db.create.mockResolvedValue({ id: "s1" });
  db.findGroup.mockResolvedValue({ key: "commercial-maintenance" });
});

describe("POST /maintenance-subscriptions (quote requests)", () => {
  const quote = { kind: "quote", packageId: "p1", groupKey: "spoofed", name: "Omar Ali", phone: "+971501234567", email: "omar@shop.ae", emirate: "Dubai", location: "Deira", company: "Ali Trading", message: "Three shops.", propertyType: "Shop", acUnits: 4, activationDate: "" };
  it("saves a quote for a custom-quotation package with the company, message and the package's own group", async () => {
    db.findPkg.mockResolvedValue({ id: "p1", nameEn: "Business Premium", price: null, groupId: "g1" });
    const r = await POST(req(quote));
    expect(r.status).toBe(201);
    expect(db.create.mock.calls[0][0].data).toMatchObject({ kind: "quote", packagePrice: null, groupKey: "commercial-maintenance", company: "Ali Trading", message: "Three shops.", acUnits: 4, bedrooms: 0 });
    expect(db.notify.mock.calls[0][0]).toMatchObject({ kind: "quote", price: null, company: "Ali Trading" });
  });
});

describe("POST /maintenance-subscriptions", () => {
  it("saves the request with the package name and price as they are now, and tells the admin", async () => {
    const r = await POST(req(good));
    expect(r.status).toBe(201);
    expect(db.create.mock.calls[0][0].data).toMatchObject({ packageId: "p1", packageName: "Gold Package", packagePrice: 1499, name: "Sara Ahmed", acUnits: 3, activationDate: null });
    expect(db.notify).toHaveBeenCalledTimes(1);
  });
  it("keeps the request even when the e-mail to the admin fails", async () => {
    db.notify.mockRejectedValue(new Error("provider down"));
    expect((await POST(req(good))).status).toBe(201);
    expect(db.create).toHaveBeenCalledTimes(1);
  });
  it("refuses invalid details, a past activation date, an unknown or switched-off package, and floods", async () => {
    expect(await code(await POST(req({ ...good, email: "nope" })))).toBe("invalid_request");
    expect(await code(await POST(req({ ...good, activationDate: "2020-01-01" })))).toBe("invalid_request");
    db.findPkg.mockResolvedValue(null);
    expect(await code(await POST(req(good)))).toBe("not_found");
    db.findPkg.mockResolvedValue({ id: "p1", nameEn: "Gold", price: 1 });
    db.count.mockResolvedValue(99);
    expect((await POST(req(good))).status).toBe(429);
    expect(db.create).not.toHaveBeenCalled();
  });
  it("only looks up packages that are active", async () => {
    await POST(req(good));
    expect(db.findPkg.mock.calls[0][0].where).toEqual({ id: "p1", active: true });
  });
});
