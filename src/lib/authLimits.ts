import { createHmac } from "crypto";

// Limits on sign-in and password-recovery attempts. Counted from the same small log table the AI finder uses (a keyed hash of
// the visitor's IP or of the account, never the plain value), so no extra database table is needed. Only FAILED sign-ins count.
export const LIMITS = {
  login: { windowMs: 15 * 60_000, perIp: 20, perAccount: 6 },
  forgot: { windowMs: 60 * 60_000, perIp: 8, perAccount: 3 },
  // "Subscribe now" requests for the maintenance packages: per visitor and per e-mail address.
  subscribe: { windowMs: 60 * 60_000, perIp: 6, perAccount: 3 },
  // Quotations built with the AC installation calculator: per visitor and per mobile number. Uploads are counted per visitor and per upload batch.
  quote: { windowMs: 60 * 60_000, perIp: 20, perAccount: 10 },
  quoteUpload: { windowMs: 60 * 60_000, perIp: 60, perAccount: 20 },
} as const;

export type LimitKind = keyof typeof LIMITS;

const keyed = (scope: string, value: string, secret = process.env.AUTH_SECRET ?? "insecure-dev-secret") => createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex").slice(0, 32);

export const ipKey = (ip: string) => keyed("auth-ip", ip);
export const accountKey = (identifier: string) => keyed("auth-account", identifier.trim().toLowerCase());

export const exceeded = (kind: LimitKind, counts: { ip: number; account: number }) => counts.ip >= LIMITS[kind].perIp || counts.account >= LIMITS[kind].perAccount;

export const clientIp = (headers: { get(name: string): string | null }) => headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";

type LogDb = {
  aiFinderLog: {
    count: (args: { where: { kind: string; ipHash: string; createdAt: { gte: Date } } }) => Promise<number>;
    create: (args: { data: { ipHash: string; kind: string } }) => Promise<unknown>;
  };
};

// True when this visitor or this account has used up its attempts. Fails open: if the log cannot be read, signing in still
// works (the password check itself is the real protection).
export async function isLimited(db: LogDb, kind: LimitKind, ip: string, identifier: string, now = Date.now()): Promise<boolean> {
  try {
    const since = new Date(now - LIMITS[kind].windowMs);
    const [byIp, byAccount] = await Promise.all([
      db.aiFinderLog.count({ where: { kind: `${kind}-ip`, ipHash: ipKey(ip), createdAt: { gte: since } } }),
      db.aiFinderLog.count({ where: { kind: `${kind}-account`, ipHash: accountKey(identifier), createdAt: { gte: since } } }),
    ]);
    return exceeded(kind, { ip: byIp, account: byAccount });
  } catch {
    return false;
  }
}

export async function recordAttempt(db: LogDb, kind: LimitKind, ip: string, identifier: string): Promise<void> {
  try {
    await Promise.all([
      db.aiFinderLog.create({ data: { kind: `${kind}-ip`, ipHash: ipKey(ip) } }),
      db.aiFinderLog.create({ data: { kind: `${kind}-account`, ipHash: accountKey(identifier) } }),
    ]);
  } catch {
    // Not recording is better than failing the request.
  }
}
