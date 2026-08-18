import { notFound } from "next/navigation";
import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAed, formatUaePhone } from "@/lib/format";
import { formatDateSlash } from "@/lib/format";
import {
  CUSTOMER_STATUS_STYLES,
  getCustomersFinancialMap,
  getFinancialsFor,
  buildCustomerActivity,
  buildCustomerWhatsAppUrl,
} from "@/lib/customerData";
import {
  getCustomerRelationshipLabel,
  getRentalAgreementsForCustomer,
  getCustomerRentalSummary,
  getRentalTransactions,
  getRentalAlerts,
  ensureRentalTransactionsGenerated,
  refreshOverdueStatuses,
} from "@/lib/rentalData";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CustomerProfileTabs } from "@/components/customer/CustomerProfileTabs";
import { CustomerStatusControl } from "@/components/customer/CustomerStatusControl";
import { DeleteCustomerButton } from "@/components/customer/DeleteCustomerButton";

export default async function AdminCustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: true, invoice: true, doneBy: true, cancelledBy: true, rescheduledBy: true },
      },
      invoices: {
        orderBy: { date: "desc" },
        include: { items: true, order: true },
      },
      quotations: {
        orderBy: { date: "desc" },
        include: { items: true },
      },
      customerNotes: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: true },
      },
      createdBy: true,
      updatedBy: true,
    },
  });
  if (!customer) notFound();

  const financialsMap = await getCustomersFinancialMap([customer.id]);
  const financials = getFinancialsFor(financialsMap, customer.id);
  const activity = buildCustomerActivity(customer);

  // Top up this customer's rolling rental-transaction window on every profile view
  // -- this app has no cron, so a page-load call is the only trigger. Scoped to
  // just this customer's active agreements rather than the company-wide sweep
  // (that one belongs to the Finance -> Rental Expenses page instead).
  const activeAgreementIds = await prisma.rentalAgreement.findMany({
    where: { customerId: customer.id, status: "Active" },
    select: { id: true },
  });
  for (const a of activeAgreementIds) {
    await ensureRentalTransactionsGenerated(a.id);
  }
  await refreshOverdueStatuses();

  const [relationshipLabel, rentalAgreements, rentalSummary, rentalTransactions, rentalAlerts] = await Promise.all([
    getCustomerRelationshipLabel(customer.id),
    getRentalAgreementsForCustomer(customer.id),
    getCustomerRentalSummary(customer.id),
    getRentalTransactions({ customerId: customer.id }),
    getRentalAlerts(customer.id),
  ]);
  const displayName = customer.type === "COMPANY" ? customer.companyName || customer.name : customer.name;
  const whatsappUrl = buildCustomerWhatsAppUrl(customer);
  const canPermanentlyDelete = customer.orders.length === 0 && customer.invoices.length === 0 && customer.quotations.length === 0;

  const payments = customer.invoices.map((inv) => ({
    id: inv.id,
    date: inv.date,
    invoiceNumber: inv.number,
    orderNumber: inv.order?.number ?? null,
    amount: inv.amount,
    method: inv.payment,
    status: inv.status,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Customers" />
      <div className="px-6 py-6">
        <Link href="/admin/customers" className="text-sm text-blue-600 font-medium">
          ← Back to Customers
        </Link>

        <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{customer.code}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  CUSTOMER_STATUS_STYLES[customer.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {customer.status}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{relationshipLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-green-600 hover:bg-slate-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1120.2 12 8.2 8.2 0 0112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.5.1-.5.8-.6.9-.2.2-.4.1a6.7 6.7 0 01-2-1.2 7.4 7.4 0 01-1.4-1.7c-.1-.2 0-.3.1-.5l.4-.4a1.6 1.6 0 00.2-.4.5.5 0 000-.4c-.1-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a.9.9 0 00-.6.3 2.7 2.7 0 00-.8 2 4.7 4.7 0 001 2.5 10.6 10.6 0 004.1 3.6c.6.2 1 .4 1.4.5a3.3 3.3 0 001.5.1 2.4 2.4 0 001.6-1.1 2 2 0 00.1-1.1c-.1-.1-.2-.1-.4-.2z" />
              </svg>
              WhatsApp Customer
            </a>
            <Link
              href={`/admin/customers/${customer.id}/edit`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit Customer
            </Link>
            <Link
              href={`/admin/orders/new?customerId=${customer.id}`}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              Create Order
            </Link>
            <Link
              href={`/admin/quotations/new?customerId=${customer.id}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create Quotation
            </Link>
            <Link
              href={`/admin/invoices/new?customerId=${customer.id}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create Invoice
            </Link>
          </div>
        </div>

        {customer.status === "Blocked" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Warning: This customer is currently blocked. Only authorized users should create new orders for them.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer Information</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Customer ID" value={customer.code} />
            <Row label="Phone" value={formatUaePhone(customer.phone)} />
            <Row label="WhatsApp" value={customer.whatsapp ? formatUaePhone(customer.whatsapp) : "—"} />
            <Row label="Email" value={customer.email ?? "—"} />
            <Row label="Language" value={customer.language} />
            <Row label="Emirate" value={customer.emirate} />
            <Row label="City" value={customer.city ?? "—"} />
            <Row label="Area" value={customer.area ?? "—"} />
            <Row label="Building Type" value={customer.buildingType ?? "—"} />
            <Row
              label="Full Address"
              value={
                customer.address ||
                [customer.buildingName, customer.flatNo, customer.area, customer.city, customer.emirate].filter(Boolean).join(", ") ||
                "—"
              }
            />
            <Row
              label="Google Maps"
              value={
                customer.locationUrl ? (
                  <a href={customer.locationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                    Open Location
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Created" value={`${formatDateSlash(customer.createdAt)} · ${customer.createdBy?.name ?? "—"}`} />
            <Row label="Last Updated" value={`${formatDateSlash(customer.updatedAt)} · ${customer.updatedBy?.name ?? "—"}`} />
          </dl>
          {customer.notes && (
            <>
              <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1">Customer Notes</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.notes}</p>
            </>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <SummaryCard label="Total Orders" value={String(financials.totalOrders)} valueClassName="text-blue-700" />
          <SummaryCard label="Completed Orders" value={String(financials.completedOrders)} valueClassName="text-green-600" />
          <SummaryCard label="Total Revenue" value={formatAed(financials.totalRevenue)} valueClassName="text-slate-900" />
          <SummaryCard label="Paid" value={formatAed(financials.paidAmount)} valueClassName="text-green-600" />
          <SummaryCard label="Outstanding" value={formatAed(financials.outstandingAmount)} valueClassName="text-orange-500" />
          <SummaryCard
            label="Last Order"
            value={financials.lastOrderDate ? formatDateSlash(financials.lastOrderDate) : "—"}
            valueClassName="text-slate-900"
          />
        </div>

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <CustomerStatusControl customerId={customer.id} currentStatus={customer.status} />
          {canPermanentlyDelete && <DeleteCustomerButton customerId={customer.id} />}
        </div>

        <CustomerProfileTabs
          orders={customer.orders.map((o) => ({
            id: o.id,
            number: o.number,
            orderType: o.orderType,
            date: o.date,
            scheduledAt: o.scheduledAt,
            status: o.status,
            assignedToName: o.assignedTo?.name ?? "Unassigned",
            emirate: customer.emirate,
            invoiceNumber: o.invoice?.number ?? null,
            invoiceId: o.invoiceId,
            amount: o.invoice?.amount ?? null,
          }))}
          invoices={customer.invoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            orderNumber: inv.order?.number ?? null,
            date: inv.date,
            services: inv.items.map((it) => it.serviceName).join(", "),
            amount: inv.amount,
            refundedAmount: inv.refundedAmount,
            payment: inv.payment,
            status: inv.status,
          }))}
          quotations={customer.quotations.map((q) => ({
            id: q.id,
            number: q.number,
            date: q.date,
            services: q.items.map((it) => it.serviceName).join(", "),
            amount: q.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0),
          }))}
          payments={payments}
          activity={activity}
          notes={customer.customerNotes.map((n) => ({
            id: n.id,
            note: n.note,
            createdAt: n.createdAt,
            createdByName: n.createdBy.name,
          }))}
          customerId={customer.id}
          rental={{
            relationshipLabel,
            financials: {
              totalRevenue: financials.totalRevenue,
              paidAmount: financials.paidAmount,
              outstandingAmount: financials.outstandingAmount,
            },
            summary: rentalSummary,
            agreements: rentalAgreements,
            transactions: rentalTransactions,
            alerts: rentalAlerts,
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-slate-50 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 text-right">{value}</dd>
    </div>
  );
}

function SummaryCard({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${valueClassName}`}>{value}</div>
    </div>
  );
}
