export const ORDER_STATUSES = ["Assigned", "Accepted", "On The Way", "Arrived", "In Progress", "Done"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_STYLES: Record<string, string> = {
  Assigned: "bg-slate-100 text-slate-600",
  Accepted: "bg-blue-50 text-blue-600",
  "On The Way": "bg-amber-50 text-amber-600",
  Arrived: "bg-purple-50 text-purple-600",
  "In Progress": "bg-orange-50 text-orange-600",
  Done: "bg-green-50 text-green-600",
};

export const ORDER_PHOTO_KINDS = ["Before", "After"] as const;
export type OrderPhotoKind = (typeof ORDER_PHOTO_KINDS)[number];
export const MAX_ORDER_PHOTOS_PER_KIND = 6;

export const ORDER_TYPES = ["New Order", "Revisit", "Inspection"] as const;
export const PRICE_AGREED_OPTIONS = ["Yes", "No"] as const;
export const CUSTOMER_LANGUAGES = ["Arabic", "English"] as const;

// UAE has no DST, so its UTC offset is fixed year-round.
const UAE_OFFSET_HOURS = 4;

// Interprets a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") as UAE
// local time and returns the corresponding UTC instant.
export function parseUaeDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - UAE_OFFSET_HOURS, Number(minute))
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

// Formats a UTC instant back into a <input type="datetime-local"> value
// ("YYYY-MM-DDTHH:mm") representing UAE local time.
export function toUaeDateTimeLocalValue(date: Date): string {
  const uae = new Date(date.getTime() + UAE_OFFSET_HOURS * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${uae.getUTCFullYear()}-${pad(uae.getUTCMonth() + 1)}-${pad(uae.getUTCDate())}T${pad(uae.getUTCHours())}:${pad(uae.getUTCMinutes())}`;
}

function toGoogleCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl(order: {
  number: string;
  scheduledAt: Date | null;
  customerName: string;
  phone: string;
  address: string;
  locationUrl: string;
  orderType: string;
  priceAgreed: string;
  customerLanguage: string;
  team: string;
  assignedTo: string;
  notes: string | null;
}) {
  const start = order.scheduledAt ?? new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const detailLines = [
    `OSTA Services - Order ${order.number}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    `Location: ${order.locationUrl}`,
    `Order Type: ${order.orderType}`,
    `Price Agreed: ${order.priceAgreed}`,
    `Customer Language: ${order.customerLanguage}`,
    `Team: ${order.team}`,
    `Assigned To: ${order.assignedTo}`,
    order.notes ? `Notes: ${order.notes}` : null,
  ].filter(Boolean);
  const params = new URLSearchParams({
    text: `OSTA Booking - ${order.customerName}`,
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
    details: detailLines.join("\n"),
    location: order.address,
  });
  return `https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`;
}

export function buildGoogleMapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function buildWhatsAppUrl(order: {
  number: string;
  customerName: string;
  phone: string;
  address: string;
  locationUrl: string;
  orderType: string;
  priceAgreed: string;
  customerLanguage: string;
  status: string;
  team: string;
  assignedTo: string;
  scheduledAt: string | null;
  notes: string | null;
}) {
  const lines = [
    `OSTA Services - Order ${order.number}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    `Location: ${order.locationUrl}`,
    `Order Type: ${order.orderType}`,
    `Price Agreed: ${order.priceAgreed}`,
    `Customer Language: ${order.customerLanguage}`,
    `Team: ${order.team}`,
    `Assigned To: ${order.assignedTo}`,
    order.scheduledAt ? `Scheduled: ${order.scheduledAt}` : null,
    `Status: ${order.status}`,
    order.notes ? `Notes: ${order.notes}` : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}

