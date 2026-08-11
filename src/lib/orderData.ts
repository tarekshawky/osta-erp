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

export const WHATSAPP_MESSAGE_TYPES = ["Accepted", "On The Way", "Arrived"] as const;
export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

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

// Normalizes a stored customer phone (e.g. "501212697" or "+971501212697")
// into bare digits with the country code, as wa.me requires.
export function toWaPhoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("971")) return digits;
  const trimmed = digits.startsWith("0") ? digits.slice(1) : digits;
  return `971${trimmed}`;
}

export function buildCustomerWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${toWaPhoneDigits(phone)}?text=${encodeURIComponent(message)}`;
}

function bilingualMessage(customerLanguage: string, arabic: string, english: string) {
  const [first, second] = customerLanguage === "English" ? [english, arabic] : [arabic, english];
  return `${first}\n\n----------\n\n${second}`;
}

export function buildAcceptedWhatsAppMessage(customerName: string, employeeName: string, customerLanguage: string) {
  const ar = `مرحباً ${customerName}،\n\nتم استلام طلبكم بواسطة الموظف ${employeeName}.\n\nنعمل حالياً على إنهاء الأعمال الحالية.\n\nوسوف نوافيكم بآخر المستجدات.\n\nشكراً لاختياركم OSTA Services.`;
  const en = `Hello ${customerName},\n\nYour service request has been accepted by our employee ${employeeName}.\n\nWe are currently completing our ongoing jobs.\n\nWe will keep you updated shortly.\n\nThank you for choosing OSTA Services.`;
  return bilingualMessage(customerLanguage, ar, en);
}

export function buildOnTheWayWhatsAppMessage(customerName: string, etaMinutes: string, customerLanguage: string) {
  const ar = `مرحباً ${customerName}،\n\nالموظف في الطريق إليكم الآن.\n\nالوقت المتوقع للوصول ${etaMinutes} دقيقة.`;
  const en = `Hello ${customerName},\n\nOur employee is on the way.\n\nEstimated arrival: ${etaMinutes} Minutes.`;
  return bilingualMessage(customerLanguage, ar, en);
}

export function buildArrivedWhatsAppMessage(customerName: string, customerLanguage: string) {
  const ar = `مرحباً ${customerName}،\n\nوصل الموظف إلى موقعكم.\n\nونحن الآن بانتظاركم خارج المبنى.`;
  const en = `Hello ${customerName},\n\nOur employee has arrived.\n\nWe are waiting outside.`;
  return bilingualMessage(customerLanguage, ar, en);
}
