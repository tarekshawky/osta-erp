import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { STANDARD_PACKAGES, STANDARD_SERVICES, type Pkg } from "@/lib/maintenance/packages";
import { defaultBuilder, type Option } from "@/lib/maintenance/builder";

const db = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn(), remove: vi.fn(), count: vi.fn(), logCreate: vi.fn(), notify: vi.fn(), contract: vi.fn(), afterSub: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { maintenanceSubscription: { create: db.create, delete: db.remove }, aiFinderLog: { count: db.count, create: db.logCreate } } }));
vi.mock("@/lib/contracts/service", () => ({ createFromSubmission: db.contract, afterSubmission: db.afterSub }));
vi.mock("@/lib/contracts/terms", () => ({ activeTerms: async () => ({ id: "t1", version: 3, clauses: [] }) }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/maintenance/data", () => ({ loadEngineData: db.load }));
vi.mock("@/lib/emailSender", () => ({ notifyAdminOfMaintenanceSubscription: db.notify }));
import { POST as evaluate } from "./evaluate/route";
import { POST as submit } from "./submit/route";

const services = STANDARD_SERVICES.map((s) => ({ id: s.key, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, metric: s.metric }));
const packages: Pkg[] = STANDARD_PACKAGES.map((p, i) => ({
  id: ["essential", "silver", "gold", "platinum"][i], nameEn: p.nameEn, nameAr: p.nameAr, descriptionEn: "", descriptionAr: "", suitableEn: "", suitableAr: "", price: p.price, maxAcUnits: p.maxAcUnits,
  badgeEn: "", badgeAr: "", highlighted: false, bullets: [], lines: p.lines.map((l) => ({ serviceId: l.service, quantityEn: l.en, quantityAr: l.ar, ...(l.limit != null ? { limit: l.limit } : {}) })),
}));
const options: Option[] = [
  { id: "o-vents", category: "ac", nameEn: "AC Duct Vent Cleaning", nameAr: "تنظيف فتحات الدكت", serviceId: "vents", extraPrice: null, upgradeTrigger: true },
  { id: "o-heater", category: "plumbing", nameEn: "Water Heater Maintenance", nameAr: "صيانة السخانات", serviceId: null, extraPrice: 80, upgradeTrigger: true },
];
const engine = (enabled = true, fields: Partial<ReturnType<typeof defaultBuilder>["fields"]> = {}) => {
  const config = defaultBuilder();
  return { groupId: null, pub: { packages, services, terms: { en: [], ar: [] } }, config: { ...config, enabled, fields: { ...config.fields, ...fields } }, options, tax: { vatRatePercent: 5, pricesIncludeVat: true } };
};
const post = (path: string, body: unknown) => new NextRequest(`http://x/api/v1/maintenance-builder/${path}`, { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": "6.6.6.6" } });
const json = async (r: Response) => (await r.json()) as { data?: Record<string, never>; error?: { code: string } };

beforeEach(() => {
  for (const m of Object.values(db)) m.mockReset();
  db.load.mockResolvedValue(engine());
  db.count.mockResolvedValue(0); db.logCreate.mockResolvedValue({}); db.notify.mockResolvedValue(undefined); db.create.mockResolvedValue({ id: "r1" }); db.remove.mockResolvedValue({}); db.afterSub.mockResolvedValue({});
  db.contract.mockResolvedValue({ id: "c1", number: "OSTA-AGR-2026-000001", requestNumber: "OSTA-REQ-2026-000001", accessToken: "tok123" });
});

describe("POST /maintenance-builder/evaluate", () => {
  it("answers with the upgrade notice, the recommendation and the price", async () => {
    const r = await evaluate(post("evaluate", { group: "", selectedId: "essential", needs: { acUnits: 5 } }));
    expect(r.status).toBe(200);
    const d = (await json(r)).data as unknown as { recommendedId: string; notices: { kind: string; en: string }[]; breakdown: { packageId: string; subtotal: number } };
    expect(d.recommendedId).toBe("gold"); expect(d.notices[0].kind).toBe("ac"); expect(d.notices[0].en).toContain("Upgrade to Gold Package");
    expect(d.breakdown).toMatchObject({ packageId: "essential", subtotal: 699 }); // not switched without consent
  });
  it("prices an accepted upgrade when asked for it", async () => {
    const d = (await json(await evaluate(post("evaluate", { group: "", selectedId: "essential", chosenId: "gold", needs: { acUnits: 5 } })))).data as unknown as { breakdown: { packageId: string; subtotal: number } };
    expect(d.breakdown).toMatchObject({ packageId: "gold", subtotal: 1499 });
  });
  it("refuses bad input, an unknown package, and a group without the builder", async () => {
    expect((await evaluate(post("evaluate", { selectedId: "essential", needs: { acUnits: 9999 } }))).status).toBe(400);
    expect((await evaluate(post("evaluate", { selectedId: "nope", needs: {} }))).status).toBe(404);
    db.load.mockResolvedValue(engine(false));
    expect((await evaluate(post("evaluate", { selectedId: "essential", needs: {} }))).status).toBe(404);
    db.load.mockResolvedValue(null);
    expect((await evaluate(post("evaluate", { group: "gone", selectedId: "essential", needs: {} }))).status).toBe(404);
  });
});

describe("POST /maintenance-builder/submit", () => {
  const body = {
    group: "", selectedId: "essential", needs: { acUnits: 5, handymanHours: 0, optionIds: ["o-vents", "o-heater"], extras: {}, otherText: "" },
    customer: { name: "Sara Ahmed", phone: "+971568676036", whatsapp: "", email: "Sara@Example.com", emirate: "Dubai", area: "Marina", address: "Tower 1" },
    property: { type: "apartment", bedrooms: 2, bathrooms: 2, floors: 1, size: 120 }, notes: "Morning visits please", activationDate: "", wantsQuote: false,
    total: 1, subtotal: 1, // numbers the browser should not be able to set
  };
  it("stores the price the SERVER worked out, plus the suggestion and the details, and tells the admin", async () => {
    const r = await submit(post("submit", body));
    expect(r.status).toBe(201);
    const row = db.create.mock.calls[0][0].data;
    expect(row).toMatchObject({ kind: "builder", packageName: "Essential Package", packagePrice: 699, suggestedPackage: "Gold Package", status: "Upgrade Suggested", email: "sara@example.com", propertyType: "Apartment", acUnits: 5, area: "Marina", propertySize: 120 });
    expect(row.total).not.toBe(1); expect(row.quoteRequested).toBe(true); // 3 extra AC units and the vents have no approved price
    expect(row.details.services).toEqual(["AC Duct Vent Cleaning", "Water Heater Maintenance"]);
    expect(row.details.lines.find((l: { label: string }) => l.label === "Water Heater Maintenance")).toMatchObject({ amount: 80 });
    expect(db.notify).toHaveBeenCalledTimes(1);
  });
  const agreement = { accepted: [true, true, true, true, true], lang: "ar" };
  it("an accepted upgrade is stored as the chosen package", async () => {
    await submit(post("submit", { ...body, chosenId: "gold", agreement }));
    expect(db.create.mock.calls[0][0].data).toMatchObject({ packageName: "Gold Package", packagePrice: 1499, status: "New Request" });
  });
  it("confirming a subscription needs every statement of the agreement ticked, a quotation request does not", async () => {
    const priced = { ...body, chosenId: "gold", needs: { ...body.needs, optionIds: [] } };
    const none = await submit(post("submit", priced));
    expect(none.status).toBe(400); expect((await json(none)).error?.code).toBe("agreement_required");
    expect((await submit(post("submit", { ...priced, agreement: { accepted: [true, true, true, true, false], lang: "en" } }))).status).toBe(400);
    expect((await submit(post("submit", { ...priced, agreement: { accepted: [true, true], lang: "en" } }))).status).toBe(400); // five statements, no fewer
    expect(db.create).not.toHaveBeenCalled(); expect(db.contract).not.toHaveBeenCalled();
    expect((await submit(post("submit", { ...body, wantsQuote: true }))).status).toBe(201);
    expect(db.contract).not.toHaveBeenCalled(); // no commitment, no agreement
  });
  it("an accepted subscription creates the agreement from the SERVER's price, records the acceptance and builds the PDF afterwards", async () => {
    const r = await submit(post("submit", { ...body, chosenId: "gold", needs: { ...body.needs, optionIds: [] }, agreement }));
    expect(r.status).toBe(201);
    const out = (await json(r)).data as unknown as { contract: { number: string; url: string } };
    expect(out.contract).toMatchObject({ number: "OSTA-AGR-2026-000001" }); expect(out.contract.url).toContain("/agreement/tok123");
    const arg = db.contract.mock.calls[0][0];
    expect(arg).toMatchObject({ subscriptionId: "r1", lang: "ar", ip: "6.6.6.6" });
    expect(arg.snapshot.pricing.total).toBe(1499); expect(arg.snapshot.terms.version).toBe(3); expect(arg.snapshot.package.nameEn).toBe("Gold Package");
    expect(arg.snapshot.customer.email).toBe("sara@example.com"); expect(arg.snapshot.property.address).toBe("Tower 1");
    expect(db.afterSub).toHaveBeenCalledWith("c1");
  });
  it("takes the request back when the agreement cannot be created, so the customer can try again", async () => {
    db.contract.mockRejectedValue(new Error("db down"));
    const r = await submit(post("submit", { ...body, chosenId: "gold", needs: { ...body.needs, optionIds: [] }, agreement }));
    expect(r.status).toBe(500); expect(db.remove).toHaveBeenCalledWith({ where: { id: "r1" } });
  });
  it("the customer asking for a quotation is recorded as such", async () => {
    await submit(post("submit", { ...body, selectedId: "gold", chosenId: "gold", needs: { ...body.needs, acUnits: 4, optionIds: [] }, wantsQuote: true }));
    expect(db.create.mock.calls[0][0].data).toMatchObject({ quoteRequested: true, subtotal: 1499 });
  });
  it("keeps the request when the e-mail to the admin fails", async () => {
    db.notify.mockRejectedValue(new Error("down"));
    expect((await submit(post("submit", body))).status).toBe(201);
  });
  it("enforces the admin's required fields and property types", async () => {
    db.load.mockResolvedValue(engine(true, { whatsapp: "required", area: "off" }));
    expect((await submit(post("submit", body))).status).toBe(400); // whatsapp is required and empty
    expect((await submit(post("submit", { ...body, customer: { ...body.customer, whatsapp: "+971501112233" } }))).status).toBe(201);
    db.load.mockResolvedValue(engine());
    expect((await submit(post("submit", { ...body, property: { ...body.property, type: "castle" } }))).status).toBe(400);
  });
  it("refuses invalid details, a past date, an unknown package, a disabled builder, and floods", async () => {
    expect((await submit(post("submit", { ...body, customer: { ...body.customer, email: "x" } }))).status).toBe(400);
    expect((await submit(post("submit", { ...body, activationDate: "2020-01-01" }))).status).toBe(400);
    expect((await submit(post("submit", { ...body, selectedId: "nope" }))).status).toBe(404);
    db.load.mockResolvedValue(engine(false));
    expect((await submit(post("submit", body))).status).toBe(404);
    db.load.mockResolvedValue(engine()); db.count.mockResolvedValue(99);
    expect((await submit(post("submit", body))).status).toBe(429);
    expect(db.create).not.toHaveBeenCalled();
  });
});
