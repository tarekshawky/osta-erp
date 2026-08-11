import Link from "next/link";
import { formatDateTimeSlash, formatUaePhone } from "@/lib/format";
import {
  ORDER_STATUS_STYLES,
  buildGoogleCalendarUrl,
  buildGoogleMapsSearchUrl,
  buildWhatsAppUrl,
  type OrderStatus,
} from "@/lib/orderData";
import { OrderStatusButton } from "./OrderStatusButton";

type OrderDetailData = {
  id: string;
  number: string;
  date: Date;
  scheduledAt: Date | null;
  locationUrl: string | null;
  orderType: string;
  priceAgreed: string;
  customerLanguage: string;
  notes: string | null;
  status: string;
  customer: {
    name: string;
    companyName: string | null;
    phone: string;
    emirate: string;
    buildingName: string | null;
    flatNo: string | null;
  };
  team: { name: string } | null;
  assignedTo: { name: string; code: string };
  createdBy: { name: string };
  invoiceId: string | null;
  invoice: { number: string } | null;
};

export function OrderDetail({
  order,
  basePath,
  canAdvance,
}: {
  order: OrderDetailData;
  basePath: "/admin" | "/employee";
  canAdvance: boolean;
}) {
  const displayName = order.customer.companyName || order.customer.name;
  const address = [order.customer.buildingName, order.customer.flatNo, order.customer.emirate].filter(Boolean).join(", ");
  const locationHref = order.locationUrl || buildGoogleMapsSearchUrl(address);
  const calendarUrl = buildGoogleCalendarUrl({
    number: order.number,
    scheduledAt: order.scheduledAt,
    customerName: displayName,
    address,
  });
  const whatsappUrl = buildWhatsAppUrl({
    number: order.number,
    customerName: displayName,
    phone: formatUaePhone(order.customer.phone),
    address: address || "—",
    orderType: order.orderType,
    priceAgreed: order.priceAgreed,
    customerLanguage: order.customerLanguage,
    status: order.status,
    team: order.team?.name ?? "—",
    assignedTo: `${order.assignedTo.name} (${order.assignedTo.code})`,
    scheduledAt: order.scheduledAt ? formatDateTimeSlash(order.scheduledAt) : null,
    notes: order.notes,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Order</div>
            <div className="text-lg font-bold text-slate-900">{order.number}</div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
            {order.status}
          </span>
        </div>
        <div className="mt-3 text-sm text-slate-500">{formatDateTimeSlash(order.date)}</div>
        {order.scheduledAt && (
          <div className="mt-1 text-sm text-slate-500">Scheduled: {formatDateTimeSlash(order.scheduledAt)}</div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{order.orderType}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Price Agreed: {order.priceAgreed}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {order.customerLanguage}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer</h3>
        <dl className="text-sm flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900 font-medium">{displayName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-900">{formatUaePhone(order.customer.phone)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Address</dt>
            <dd className="text-slate-900 text-right">{address || "—"}</dd>
          </div>
        </dl>
        <a
          href={locationHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-blue-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Open Location
        </a>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Assignment</h3>
        <dl className="text-sm flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-slate-500">Assigned To</dt>
            <dd className="text-slate-900 font-medium">
              {order.assignedTo.name} · {order.assignedTo.code}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Team</dt>
            <dd className="text-slate-900">{order.team?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Created By</dt>
            <dd className="text-slate-900">{order.createdBy.name}</dd>
          </div>
        </dl>
        {order.notes && (
          <>
            <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1">Notes</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-green-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1120.2 12 8.2 8.2 0 0112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.5.1-.5.8-.6.9-.2.2-.4.1a6.7 6.7 0 01-2-1.2 7.4 7.4 0 01-1.4-1.7c-.1-.2 0-.3.1-.5l.4-.4a1.6 1.6 0 00.2-.4.5.5 0 000-.4c-.1-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.8 2 4.7 4.7 0 001 2.5 10.6 10.6 0 004.1 3.6c.6.2 1 .4 1.4.5a3.3 3.3 0 001.5.1 2.4 2.4 0 001.6-1.1 2 2 0 00.1-1.1c-.1-.1-.2-.1-.4-.2z" />
          </svg>
          WhatsApp
        </a>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-blue-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
          </svg>
          Add to Calendar
        </a>
      </div>

      {canAdvance && order.status !== "Done" && (
        <OrderStatusButton orderId={order.id} status={order.status as OrderStatus} />
      )}

      {order.status === "Done" && (
        <Link
          href={order.invoiceId ? `${basePath}/invoices/${order.invoiceId}` : `${basePath}/invoices/new?orderId=${order.id}`}
          className="w-full rounded-xl bg-green-600 text-white font-medium text-sm py-3.5 text-center"
        >
          {order.invoiceId ? "View Invoice" : "Create Invoice"}
        </Link>
      )}
    </div>
  );
}
