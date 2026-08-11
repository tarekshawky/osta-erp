export const ORDER_STATUSES = ["Pending", "Confirmed", "On The Way", "Arrived", "Done"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  Pending: "Confirmed",
  Confirmed: "On The Way",
  "On The Way": "Arrived",
  Arrived: "Done",
  Done: null,
};

export const STATUS_ACTION_LABEL: Record<OrderStatus, string | null> = {
  Pending: "Confirm Order",
  Confirmed: "Mark On The Way",
  "On The Way": "Mark Arrived",
  Arrived: "Mark Done",
  Done: null,
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-600",
  Confirmed: "bg-blue-50 text-blue-600",
  "On The Way": "bg-amber-50 text-amber-600",
  Arrived: "bg-purple-50 text-purple-600",
  Done: "bg-green-50 text-green-600",
};

export const ORDER_TYPES = ["New Order", "Revisit", "Inspection"] as const;
export const PRICE_AGREED_OPTIONS = ["Yes", "No"] as const;
export const CUSTOMER_LANGUAGES = ["Arabic", "English"] as const;

function toGoogleCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl(order: {
  number: string;
  scheduledAt: Date | null;
  customerName: string;
  address: string;
}) {
  const start = order.scheduledAt ?? new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    text: `OSTA Booking - ${order.customerName}`,
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
    details: `Order ${order.number} for ${order.customerName}.`,
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
