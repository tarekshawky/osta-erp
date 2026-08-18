export function formatAed(amount: number) {
  // Normalizes -0 to 0 so a value that nets to exactly zero never renders "-0.00".
  const value = amount === 0 ? 0 : amount;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `AED ${formatted}`;
}

export function formatUaePhone(phone: string) {
  if (!phone) return "";
  return phone.startsWith("+") ? phone : `+971${phone}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const UAE_TIMEZONE = "Asia/Dubai";

export function formatDateSlash(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UAE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} / ${get("month")} / ${get("year")}`;
}

export function formatDateTimeSlash(date: Date) {
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: UAE_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatDateSlash(date)}  ${time}`;
}

export function formatNumber2(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
