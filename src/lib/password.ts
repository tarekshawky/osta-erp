import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHex] = hash.split(":");
  if (!salt || !storedHex) return false;
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(storedHex, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

// First letter capital, at least one digit, 8+ characters. Applied both when an
// admin sets a customer's password (CustomerForm) and when validating the login
// payload shape before hitting the database.
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /^[A-Z]/.test(password) && /[0-9]/.test(password);
}

export const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters, start with a capital letter, and include a number.";
