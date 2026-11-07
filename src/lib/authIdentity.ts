// The customer app lets people sign in with an email or a mobile number. Phones were stored exactly as typed over the years
// ("0501234567", "501234567", "971501234567", "+971 50 123 4567"), so a mobile number is matched against every common way the
// same UAE number could have been saved.

export type Identifier = { kind: "email"; email: string } | { kind: "phone"; digits: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classifyIdentifier(raw: unknown): Identifier | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > 120) return null;
  if (v.includes("@")) return EMAIL.test(v) ? { kind: "email", email: v.toLowerCase() } : null;
  const digits = v.replace(/\D/g, "");
  // A mobile number has 8-15 digits (E.164 allows up to 15); anything else is not a phone.
  return digits.length >= 8 && digits.length <= 15 ? { kind: "phone", digits } : null;
}

// The UAE national number: no "00" or "971" prefix and no leading zero ("0501234567" -> "501234567").
export function nationalNumber(digits: string): string {
  let d = digits.replace(/^00/, "");
  if (d.startsWith("971") && d.length > 9) d = d.slice(3);
  return d.replace(/^0+/, "");
}

export function phoneVariants(digits: string): string[] {
  const n = nationalNumber(digits);
  if (!n) return [];
  const set = new Set([n, `0${n}`, `971${n}`, `+971${n}`, `00971${n}`, digits]);
  // Numbers that are not UAE ones (another country code typed in full) are matched as typed.
  return [...set];
}
