import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "insecure-dev-secret";
const COOKIE_NAME = "osta_session";

export type SessionPayload = {
  employeeId: string;
  role: "EMPLOYEE" | "ADMIN";
};

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function hashPin(pin: string) {
  return createHash("sha256").update(`${SECRET}:${pin}`).digest("hex");
}

export function verifyPin(pin: string, hash: string) {
  const candidate = hashPin(pin);
  const a = Buffer.from(candidate);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  const store = await cookies();
  store.set(COOKIE_NAME, `${body}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
