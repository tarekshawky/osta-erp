import { describe, it, expect } from "vitest";
import { csvCell, formProblem, hashIp, isRateLimited, looksLikeBot, toCsv, validateSubmission, type FormField } from "./forms";

const bi = (en: string, ar = "ع") => ({ en, ar });
const fields: FormField[] = [
  { key: "name", type: "text", label: bi("Name"), required: true },
  { key: "email", type: "email", label: bi("Email"), required: false },
  { key: "phone", type: "phone", label: bi("Phone"), required: true },
  { key: "service", type: "select", label: bi("Service"), required: false, options: [{ value: "ac", label: bi("AC") }, { value: "plumbing", label: bi("Plumbing") }] },
  { key: "message", type: "textarea", label: bi("Message"), required: false },
  { key: "agree", type: "checkbox", label: bi("Agree"), required: true },
];
const def = (over = {}) => ({ slug: "contact", nameEn: "Contact", nameAr: "تواصل", fields, recipients: ["a@b.co"], ...over });

describe("formProblem", () => {
  it("accepts a good form", () => expect(formProblem(def())).toBeNull());
  it("rejects bad slugs, empty forms, duplicate or reserved keys", () => {
    expect(formProblem(def({ slug: "Bad Slug" }))).toMatch(/Slug/);
    expect(formProblem(def({ fields: [] }))).toMatch(/at least one/);
    expect(formProblem(def({ fields: [fields[0], { ...fields[0] }] }))).toMatch(/twice/);
    expect(formProblem(def({ fields: [{ ...fields[0], key: "website" }] }))).toMatch(/not a valid field key/);
    expect(formProblem(def({ fields: [{ ...fields[0], key: "1abc" }] }))).toMatch(/not a valid field key/);
  });
  it("needs two options for selects, both-language labels, and valid recipients", () => {
    expect(formProblem(def({ fields: [{ ...fields[3], options: [{ value: "a", label: bi("A") }] }] }))).toMatch(/two options/);
    expect(formProblem(def({ fields: [{ ...fields[0], label: { en: "x", ar: "" } }] }))).toMatch(/Arabic label/);
    expect(formProblem(def({ recipients: ["nope"] }))).toMatch(/Recipients/);
  });
});

describe("validateSubmission", () => {
  const ok = { name: "Sara", phone: "+971 56 867 6036", agree: true };
  it("accepts valid input and drops unknown keys", () => {
    const r = validateSubmission(fields, { ...ok, injected: "<script>", service: "ac" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ name: "Sara", service: "ac", agree: true });
      expect("injected" in r.data).toBe(false);
    }
  });
  it("reports required, email, phone, option and length errors by field", () => {
    const r = validateSubmission(fields, { name: " ", phone: "abc", email: "x", service: "roofing", message: "m".repeat(3001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ name: "required", phone: "invalid_phone", email: "invalid_email", service: "invalid_option", message: "too_long", agree: "required" });
  });
  it("copes with garbage input", () => {
    expect(validateSubmission(fields, null).ok).toBe(false);
    expect(validateSubmission(fields, { ...ok, name: { $ne: 1 } }).ok).toBe(false);
  });
});

describe("spam and privacy", () => {
  it("flags honeypot and too-fast submissions only", () => {
    expect(looksLikeBot("http://spam", 5000)).toBe(true);
    expect(looksLikeBot("", 300)).toBe(true);
    expect(looksLikeBot("", 4000)).toBe(false);
    expect(looksLikeBot(undefined, undefined)).toBe(false);
  });
  it("rate limits after 5 in the window", () => {
    expect(isRateLimited(4)).toBe(false);
    expect(isRateLimited(5)).toBe(true);
  });
  it("hashes IPs consistently without exposing them", () => {
    expect(hashIp("1.2.3.4", "s")).toBe(hashIp("1.2.3.4", "s"));
    expect(hashIp("1.2.3.4", "s")).not.toBe(hashIp("1.2.3.5", "s"));
    expect(hashIp("1.2.3.4", "s")).not.toContain("1.2.3.4");
  });
});

describe("csv", () => {
  it("defuses spreadsheet formulas and escapes quotes/commas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+971")).toBe("'+971");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(true)).toBe("Yes");
    expect(csvCell(null)).toBe("");
  });
  it("builds a BOM-prefixed CRLF csv", () => {
    const csv = toCsv([["a", "b"], ["1", "x,y"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("1,\"x,y\"\r\n");
  });
});
