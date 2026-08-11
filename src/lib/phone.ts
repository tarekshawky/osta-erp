// Normalizes a stored UAE phone (e.g. "501212697" or "+971501212697") into bare
// digits with the country code, as wa.me requires.
export function toWaPhoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("971")) return digits;
  const trimmed = digits.startsWith("0") ? digits.slice(1) : digits;
  return `971${trimmed}`;
}
