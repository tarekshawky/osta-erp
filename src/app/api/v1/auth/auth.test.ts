import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), logCreate: vi.fn(), updateMany: vi.fn(), tokenCreate: vi.fn(), tx: vi.fn(), send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findMany: db.findMany, findFirst: db.findFirst },
    aiFinderLog: { count: db.count, create: db.logCreate },
    passwordResetToken: { updateMany: db.updateMany, create: db.tokenCreate },
    $transaction: db.tx,
  },
}));
vi.mock("@/lib/customerResetMail", () => ({ sendCustomerResetLink: db.send }));
import { POST as login } from "./login/route";
import { POST as forgot } from "./forgot-password/route";
import { hashPassword } from "@/lib/password";

const req = (url: string, body: unknown, ip = "7.7.7.7") => new NextRequest(`http://x/api/v1/auth/${url}`, { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": ip } });
const json = async (r: Response) => (await r.json()) as { data?: Record<string, unknown>; error?: { code: string; message: string } };
const customer = { id: "c1", code: "C-1", name: "Sara", companyName: null, phone: "0568676036", email: "sara@example.com", language: "Arabic", passwordHash: hashPassword("Secret123") };

beforeEach(() => {
  for (const m of Object.values(db)) m.mockReset();
  db.count.mockResolvedValue(0);
  db.logCreate.mockResolvedValue({});
  db.tx.mockResolvedValue([]);
  db.send.mockResolvedValue(undefined);
  process.env.SITE_URL = "https://site.test";
});

describe("POST /auth/login", () => {
  it("signs in with an email, and with a mobile number in any saved format", async () => {
    db.findMany.mockResolvedValue([customer]);
    for (const identifier of ["sara@example.com", "+971 56 867 6036", "0568676036"]) {
      const r = await login(req("login", { identifier, password: "Secret123" }));
      expect(r.status, identifier).toBe(200);
      expect((await json(r)).data?.accessToken).toBeTruthy();
    }
    // The phone lookup asked for every saved format of the number.
    const phoneWhere = db.findMany.mock.calls[1][0].where.phone.in as string[];
    expect(phoneWhere).toEqual(expect.arrayContaining(["568676036", "0568676036", "971568676036"]));
  });
  it("still accepts the older { email, password } body", async () => {
    db.findMany.mockResolvedValue([customer]);
    expect((await login(req("login", { email: "sara@example.com", password: "Secret123" }))).status).toBe(200);
  });
  it("gives one generic answer for a wrong password and for an unknown account, and counts the failure", async () => {
    db.findMany.mockResolvedValueOnce([customer]).mockResolvedValueOnce([]);
    const wrong = await login(req("login", { identifier: "sara@example.com", password: "Wrong123" }));
    const unknown = await login(req("login", { identifier: "nobody@example.com", password: "Secret123" }));
    expect(wrong.status).toBe(401); expect(unknown.status).toBe(401);
    expect((await json(wrong)).error).toEqual((await json(unknown)).error);
    expect(db.logCreate).toHaveBeenCalledTimes(4); // ip + account, twice
  });
  it("refuses malformed requests and stops a locked account before checking the password", async () => {
    for (const body of [{}, { identifier: "x", password: "a" }, { identifier: "a@b.co" }, { identifier: "a@b.co", password: "x".repeat(300) }]) expect((await login(req("login", body))).status, JSON.stringify(body)).toBe(400);
    db.count.mockResolvedValue(99);
    const r = await login(req("login", { identifier: "sara@example.com", password: "Secret123" }));
    expect(r.status).toBe(429); expect((await json(r)).error?.code).toBe("rate_limited");
    expect(db.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /auth/forgot-password", () => {
  it("e-mails a one-hour link to the account's address and answers generically", async () => {
    db.findFirst.mockResolvedValue({ id: "c1", name: "Sara", email: "sara@example.com", language: "Arabic" });
    const r = await forgot(req("forgot-password", { identifier: "0568676036" }));
    expect(r.status).toBe(200); expect((await json(r)).data).toEqual({ requested: true });
    expect(db.send).toHaveBeenCalledTimes(1);
    const [who, url, minutes] = db.send.mock.calls[0];
    expect(who.email).toBe("sara@example.com"); expect(url).toMatch(/^https:\/\/site\.test\/reset-password\?token=[\w-]{20,}/); expect(minutes).toBe(60);
    expect(db.tx).toHaveBeenCalledTimes(1);
  });
  it("gives the same answer when there is no such account or no email, and sends nothing", async () => {
    db.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "c2", name: "NoMail", email: null, language: "English" });
    const a = await forgot(req("forgot-password", { identifier: "nobody@example.com" }));
    const b = await forgot(req("forgot-password", { identifier: "0501112233" }));
    expect(await json(a)).toEqual(await json(b));
    expect(db.send).not.toHaveBeenCalled();
  });
  it("still answers generically when the mail provider fails, and never reveals the token", async () => {
    db.findFirst.mockResolvedValue({ id: "c1", name: "Sara", email: "sara@example.com", language: "English" });
    db.send.mockRejectedValue(new Error("provider down"));
    const r = await forgot(req("forgot-password", { identifier: "sara@example.com" }));
    expect(r.status).toBe(200);
    expect(JSON.stringify(await json(r))).not.toMatch(/token|reset-password/);
  });
  it("validates the request and rate-limits it", async () => {
    expect((await forgot(req("forgot-password", { identifier: "nonsense" }))).status).toBe(400);
    db.count.mockResolvedValue(99);
    expect((await forgot(req("forgot-password", { identifier: "sara@example.com" }))).status).toBe(429);
    expect(db.findFirst).not.toHaveBeenCalled();
  });
});
