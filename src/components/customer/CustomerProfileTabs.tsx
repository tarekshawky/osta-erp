"use client";

import { useState } from "react";
import Link from "next/link";
import { formatAed, formatDateSlash } from "@/lib/format";
import { ORDER_STATUS_STYLES } from "@/lib/orderData";
import { StatusBadge } from "@/components/StatusBadge";
import { AddCustomerNoteForm } from "./AddCustomerNoteForm";

type OrderRow = {
  id: string;
  number: string;
  orderType: string;
  date: Date;
  scheduledAt: Date | null;
  status: string;
  assignedToName: string;
  emirate: string;
  invoiceNumber: string | null;
  invoiceId: string | null;
  amount: number | null;
};

type InvoiceRow = {
  id: string;
  number: string;
  orderNumber: string | null;
  date: Date;
  services: string;
  amount: number;
  refundedAmount: number;
  payment: string;
  status: string;
};

type QuotationRow = {
  id: string;
  number: string;
  date: Date;
  services: string;
  amount: number;
};

type PaymentRow = {
  id: string;
  date: Date;
  invoiceNumber: string;
  orderNumber: string | null;
  amount: number;
  method: string;
  status: string;
};

type ActivityEvent = { date: Date; title: string; detail?: string };

type NoteRow = { id: string; note: string; createdAt: Date; createdByName: string };

const TABS = ["Overview", "Orders", "Invoices", "Quotations", "Payments", "Activity", "Notes"] as const;
type Tab = (typeof TABS)[number];

export function CustomerProfileTabs({
  orders,
  invoices,
  quotations,
  payments,
  activity,
  notes,
  customerId,
}: {
  orders: OrderRow[];
  invoices: InvoiceRow[];
  quotations: QuotationRow[];
  payments: PaymentRow[];
  activity: ActivityEvent[];
  notes: NoteRow[];
  customerId: string;
}) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="mt-6">
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
            {t === "Orders" && orders.length > 0 && ` (${orders.length})`}
            {t === "Invoices" && invoices.length > 0 && ` (${invoices.length})`}
            {t === "Quotations" && quotations.length > 0 && ` (${quotations.length})`}
            {t === "Notes" && notes.length > 0 && ` (${notes.length})`}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "Overview" && <OverviewPanel orders={orders} invoices={invoices} activity={activity} />}
        {tab === "Orders" && <OrdersPanel orders={orders} />}
        {tab === "Invoices" && <InvoicesPanel invoices={invoices} />}
        {tab === "Quotations" && <QuotationsPanel quotations={quotations} />}
        {tab === "Payments" && <PaymentsPanel payments={payments} />}
        {tab === "Activity" && <ActivityPanel activity={activity} />}
        {tab === "Notes" && <NotesPanel notes={notes} customerId={customerId} />}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm text-slate-400 rounded-xl border border-slate-200 bg-white">{label}</div>;
}

function OverviewPanel({ orders, invoices, activity }: { orders: OrderRow[]; invoices: InvoiceRow[]; activity: ActivityEvent[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Most Recent Order</h4>
        {orders[0] ? (
          <Link href={`/admin/orders/${orders[0].id}`} className="text-sm text-blue-600 font-medium">
            {orders[0].number}
          </Link>
        ) : (
          <p className="text-sm text-slate-400">No orders yet.</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Most Recent Invoice</h4>
        {invoices[0] ? (
          <Link href={`/admin/invoices/${invoices[0].id}`} className="text-sm text-blue-600 font-medium">
            {invoices[0].number} · {formatAed(invoices[0].amount)}
          </Link>
        ) : (
          <p className="text-sm text-slate-400">No invoices yet.</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Activity</h4>
        {activity.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
        <div className="flex flex-col gap-2">
          {activity.slice(0, 5).map((e, i) => (
            <div key={i} className="text-sm">
              <span className="text-slate-400 text-xs">{formatDateSlash(e.date)}</span>{" "}
              <span className="text-slate-900 font-medium">{e.title}</span>
              {e.detail && <span className="text-slate-500"> — {e.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersPanel({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) return <EmptyState label="No orders for this customer yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Order #</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                <Link href={`/admin/orders/${o.id}`}>{o.number}</Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{o.orderType}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(o.scheduledAt ?? o.date)}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{o.assignedToName}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {o.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">{o.amount != null ? formatAed(o.amount) : "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {o.invoiceNumber && o.invoiceId ? (
                  <Link href={`/admin/invoices/${o.invoiceId}`} className="text-blue-600">
                    {o.invoiceNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoicesPanel({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) return <EmptyState label="No invoices for this customer yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Invoice #</th>
            <th className="px-4 py-3 font-medium">Order #</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Services</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                <Link href={`/admin/invoices/${inv.id}`}>{inv.number}</Link>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.orderNumber ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(inv.date)}</td>
              <td className="px-4 py-3 text-slate-600">{inv.services}</td>
              <td className="px-4 py-3 text-slate-600">{inv.payment}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{formatAed(inv.amount)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link href={`/admin/invoices/${inv.id}`} className="text-blue-600">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuotationsPanel({ quotations }: { quotations: QuotationRow[] }) {
  if (quotations.length === 0) return <EmptyState label="No quotations for this customer yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Quotation #</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Services</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quotations.map((q) => (
            <tr key={q.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                <Link href={`/admin/quotations/${q.id}`}>{q.number}</Link>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(q.date)}</td>
              <td className="px-4 py-3 text-slate-600">{q.services}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{formatAed(q.amount)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link href={`/admin/quotations/${q.id}`} className="text-blue-600">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsPanel({ payments }: { payments: PaymentRow[] }) {
  if (payments.length === 0) return <EmptyState label="No payments recorded for this customer yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Invoice #</th>
            <th className="px-4 py-3 font-medium">Order #</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(p.date)}</td>
              <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                <Link href={`/admin/invoices/${p.id}`}>{p.invoiceNumber}</Link>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.orderNumber ?? "—"}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{formatAed(p.amount)}</td>
              <td className="px-4 py-3 text-slate-600">{p.method}</td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityPanel({ activity }: { activity: ActivityEvent[] }) {
  if (activity.length === 0) return <EmptyState label="No activity recorded for this customer yet." />;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4">
        {activity.map((e, i) => (
          <div key={i} className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">{formatDateSlash(e.date)}</div>
              <div className="text-sm font-medium text-slate-900">{e.title}</div>
              {e.detail && <div className="text-sm text-slate-500">{e.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesPanel({ notes, customerId }: { notes: NoteRow[]; customerId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <AddCustomerNoteForm customerId={customerId} />
      {notes.length === 0 ? (
        <EmptyState label="No notes yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{n.note}</p>
              <p className="text-xs text-slate-400 mt-2">
                {n.createdByName} · {formatDateSlash(n.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
