import { createHmac } from "crypto";

// ---- form definition ----
export type Bi = { en: string; ar: string };
export const FIELD_TYPES = ["text", "email", "phone", "textarea", "select", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export type FormField = {
  key: string;
  type: FieldType;
  label: Bi;
  required: boolean;
  placeholder?: Bi;
  options?: { value: string; label: Bi }[]; // select only
};

export const RESERVED_KEYS = ["website", "ts", "elapsedMs", "language", "path", "data"];
const KEY_PATTERN = /^[a-z][a-zA-Z0-9]{0,29}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function formProblem(def: { slug: string; nameEn: string; nameAr: string; fields: FormField[]; recipients: string[] }): string | null {
  if (!SLUG_PATTERN.test(def.slug) || def.slug.length > 60) return "Slug can only contain lowercase letters, numbers and single hyphens.";
  if (!def.nameEn.trim() || !def.nameAr.trim()) return "Both the English and Arabic form names are required.";
  if (def.fields.length === 0) return "Add at least one field.";
  if (def.fields.length > 20) return "A form can have at most 20 fields.";
  const seen = new Set<string>();
  for (const f of def.fields) {
    if (!KEY_PATTERN.test(f.key) || RESERVED_KEYS.includes(f.key)) return `“${f.key || "(empty)"}” is not a valid field key (start with a letter; letters and numbers only).`;
    if (seen.has(f.key)) return `Field key “${f.key}” is used twice.`;
    seen.add(f.key);
    if (!(FIELD_TYPES as readonly string[]).includes(f.type)) return `Field “${f.key}” has an unknown type.`;
    if (!f.label.en.trim() || !f.label.ar.trim()) return `Field “${f.key}” needs an English and Arabic label.`;
    if (f.type === "select") {
      const opts = f.options ?? [];
      if (opts.length < 2) return `Field “${f.key}” needs at least two options.`;
      if (new Set(opts.map((o) => o.value)).size !== opts.length || opts.some((o) => !o.value.trim() || !o.label.en.trim() || !o.label.ar.trim())) return `Field “${f.key}” has empty or repeated options.`;
    }
  }
  if (def.recipients.length > 10 || def.recipients.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return "Recipients must be valid email addresses (max 10).";
  return null;
}

// ---- submission validation (server side; the browser form is only a convenience) ----
export type FieldError = "required" | "invalid_email" | "invalid_phone" | "invalid_option" | "too_long";
export const MAX_BODY_BYTES = 20_000;
const LIMITS: Record<FieldType, number> = { text: 200, email: 120, phone: 30, textarea: 3000, select: 200, checkbox: 5 };

export function validateSubmission(fields: FormField[], input: unknown): { ok: true; data: Record<string, string | boolean> } | { ok: false; errors: Record<string, FieldError> } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const data: Record<string, string | boolean> = {};
  const errors: Record<string, FieldError> = {};

  for (const f of fields) {
    const v = raw[f.key];
    if (f.type === "checkbox") {
      const checked = v === true || v === "true";
      if (f.required && !checked) errors[f.key] = "required";
      else data[f.key] = checked;
      continue;
    }
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) {
      if (f.required) errors[f.key] = "required";
      else data[f.key] = "";
      continue;
    }
    if (s.length > LIMITS[f.type]) errors[f.key] = "too_long";
    else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errors[f.key] = "invalid_email";
    else if (f.type === "phone" && !/^[+\d][\d\s()-]{5,24}$/.test(s)) errors[f.key] = "invalid_phone";
    else if (f.type === "select" && !(f.options ?? []).some((o) => o.value === s)) errors[f.key] = "invalid_option";
    else data[f.key] = s;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data }; // unknown keys are dropped, never stored
}

// ---- spam protection ----
export const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
export const MIN_FILL_MS = 2000;

// Honeypot filled in, or submitted faster than a person could type: silently drop.
export const looksLikeBot = (honeypot: unknown, elapsedMs: unknown) =>
  (typeof honeypot === "string" && honeypot.trim() !== "") || (typeof elapsedMs === "number" && elapsedMs < MIN_FILL_MS);

export const isRateLimited = (recentFromSameVisitor: number) => recentFromSameVisitor >= RATE_LIMIT.max;

export function hashIp(ip: string, secret = process.env.AUTH_SECRET ?? "insecure-dev-secret"): string {
  return createHmac("sha256", secret).update(`lead-ip:${ip}`).digest("hex").slice(0, 32);
}

// ---- CSV export ----
// Cells starting with = + - @ would run as formulas when opened in Excel; a leading apostrophe defuses them.
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (rows: unknown[][]) => `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
