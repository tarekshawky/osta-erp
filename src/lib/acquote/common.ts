import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

// What every self-service quotation calculator (ducted AC installation, HVAC ductwork) shares: results, the audit trail, numbering, the
// customer's private link and small helpers.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
export type Actor = { type: "admin" | "customer" | "system"; id?: string; name: string };
export type Db = Prisma.TransactionClient;

export async function log(db: Db, quoteId: string, kind: string, actor: Actor, note = "", data: Record<string, unknown> = {}) {
  await db.selfQuoteEvent.create({ data: { quoteId, kind, actorType: actor.type, actorId: actor.id ?? null, actorName: actor.name, note: note.slice(0, 1000), data: data as never } });
}

export const token = () => randomBytes(24).toString("base64url");
export const money = (n: number) => `AED ${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);

// OSTA-DQ-2026-000001 (ducted AC) or OSTA-DW-2026-000001 (ductwork), OSTA-SQ-… (split AC): the next number of this year for the prefix.
export async function nextNumber(db: Db, code: "DQ" | "DW" | "SQ"): Promise<string> {
  const prefix = `OSTA-${code}-${new Date().getUTCFullYear()}-`;
  const last = await db.selfQuote.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  return `${prefix}${String((last ? parseInt(last.number.slice(prefix.length), 10) || 0 : 0) + 1).padStart(6, "0")}`;
}

// Two people creating at the same moment can draw the same number; the unique index catches it and we simply draw again.
export async function withNumber<T>(make: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await make(); } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && /number/i.test(String(e.meta?.target ?? ""))) || i >= 5) throw e;
    }
  }
}

export async function byToken(accessToken: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(accessToken) ? prisma.selfQuote.findUnique({ where: { accessToken } }) : null;
}
