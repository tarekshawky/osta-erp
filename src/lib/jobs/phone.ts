// The default export of the "min" build works the same under ESM (Next.js, vitest) and CommonJS (scripts).
import parsePhoneNumberFromString from "libphonenumber-js/min";

// Phone numbers are stored in E.164 ("+971501234567"). Local numbers are read as UAE numbers; international numbers
// (with + or 00) are accepted as they are.
export function normalizePhone(input: string, defaultCountry: "AE" = "AE"): string | null {
  const raw = (input ?? "").replace(/[‎‏\s().-]/g, "").replace(/^00/, "+");
  if (!raw) return null;
  // Arabic-Indic digits typed on an Arabic keyboard.
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const parsed = parsePhoneNumberFromString(latin, defaultCountry);
  return parsed && parsed.isValid() ? parsed.number : null;
}

// For wa.me links: the number without "+" or spaces.
export const waDigits = (e164: string) => e164.replace(/\D/g, "");

// A search box value that may be a phone in any format: the digits that identify it, or null when it is not a phone.
export function phoneSearchDigits(query: string): string | null {
  const e164 = normalizePhone(query);
  if (e164) return waDigits(e164);
  const digits = query.replace(/\D/g, "");
  return digits.length >= 6 ? digits : null;
}
