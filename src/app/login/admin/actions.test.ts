import { beforeEach, describe, expect, it, vi } from "vitest";

type Emp = { id: string; role: string; pinHash: string };
const db = vi.hoisted(() => ({ emps: [] as { id: string; role: string; pinHash: string }[], sessions: [] as unknown[] }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: {
      findMany: async () => db.emps.filter((e) => e.role === "ADMIN" || e.role === "SUPER_ADMIN").map((e) => ({ ...e })),
      count: async () => db.emps.length,
      create: async ({ data }: { data: Omit<Emp, "id"> }) => { const e = { id: `e${db.emps.length + 1}`, ...data }; db.emps.push(e); return e; },
    },
  },
}));
vi.mock("@/lib/session", async () => {
  const real = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return { ...real, createSession: async (p: unknown) => { db.sessions.push(p); } };
});

import { loginAdmin } from "./actions";
import { hashPin } from "@/lib/session";

beforeEach(() => { db.emps = []; db.sessions = []; delete process.env.EMERGENCY_DATABASE_URL; delete process.env.EMERGENCY_POSTGRES_URL; });

describe("admin login", () => {
  it("accepts the right PIN and refuses a wrong one", async () => {
    db.emps = [{ id: "a1", role: "SUPER_ADMIN", pinHash: hashPin("1234") }];
    expect(await loginAdmin("1234")).toEqual({ ok: true });
    expect(await loginAdmin("1111")).toEqual({ ok: false });
  });
  it("on an empty emergency database the first PIN typed becomes the admin's PIN, once", async () => {
    process.env.EMERGENCY_DATABASE_URL = "postgres://alternate";
    expect(await loginAdmin("12")).toEqual({ ok: false }); // not a four-digit PIN
    expect(db.emps).toHaveLength(0);
    expect(await loginAdmin("1000")).toEqual({ ok: true });
    expect(db.emps).toHaveLength(1);
    expect(db.emps[0]).toMatchObject({ role: "SUPER_ADMIN", pinHash: hashPin("1000") });
    expect(await loginAdmin("1000")).toEqual({ ok: true }); // now a normal login
    expect(await loginAdmin("2222")).toEqual({ ok: false }); // nobody can create a second admin this way
    expect(db.emps).toHaveLength(1);
  });
  it("never creates an admin on the original database (no emergency variable), or when any employee already exists", async () => {
    expect(await loginAdmin("1000")).toEqual({ ok: false });
    expect(db.emps).toHaveLength(0);
    process.env.EMERGENCY_DATABASE_URL = "postgres://alternate";
    db.emps = [{ id: "w1", role: "EMPLOYEE", pinHash: hashPin("5555") }]; // a technician exists, so it is not a first start
    expect(await loginAdmin("1000")).toEqual({ ok: false });
    expect(db.emps).toHaveLength(1);
  });
});
