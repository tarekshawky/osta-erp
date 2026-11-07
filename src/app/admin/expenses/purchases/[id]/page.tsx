import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { formatAed, formatDateTimeSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PrintButton } from "@/components/admin/PrintButton";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { CustomerPurchaseInvoice, type PurchaseDoc } from "@/components/expense/CustomerPurchaseInvoice";
import { PurchaseActions } from "@/components/expense/PurchaseActions";
import { marginFor, PURCHASE_STATUS_STYLE } from "@/lib/customerPurchaseData";

export default async function CustomerPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireEmployee("ADMIN");
  const p = await prisma.customerPurchase.findUnique({
    where: { id },
    include: { items: true, customer: true, order: { select: { number: true, invoice: { select: { number: true } } } }, createdBy: { select: { name: true } } },
  });
  if (!p) notFound();
  const [margin, approver, history] = await Promise.all([
    marginFor(p.orderId, p.total),
    p.approvedById ? prisma.employee.findUnique({ where: { id: p.approvedById }, select: { name: true } }) : null,
    prisma.auditLog.findMany({ where: { entity: "CustomerPurchase", entityId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const doc: PurchaseDoc = {
    number: p.number, status: p.status, purchaseDate: p.purchaseDate, customerName: p.customer.type === "COMPANY" ? p.customer.companyName || p.customer.name : p.customer.name,
    customerCode: p.customer.code, orderNumber: p.order?.number ?? null, invoiceNumber: p.order?.invoice?.number ?? null, teamName: p.teamName, technicianName: p.technicianName,
    emirate: p.emirate, supplierName: p.supplierName, supplierInvoiceNo: p.supplierInvoiceNo, paymentMethod: p.paymentMethod, notes: p.notes, supplierInvoiceUrl: p.supplierInvoiceUrl,
    total: p.total, approvedByName: approver?.name ?? null, approvedAt: p.approvedAt, createdByName: p.createdBy.name,
    items: p.items.map((i) => ({ name: i.name, description: i.description, qty: i.qty, unitPrice: i.unitPrice, total: i.total })),
  };
  const canEdit = p.status !== "Approved" || admin.role === "SUPER_ADMIN";

  return (
    <div className="pb-10 print-area">
      <AdminTopBar title={p.number} hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin/expenses/purchases" className="text-sm font-medium text-blue-600 hover:underline">← All purchases</Link>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{p.number}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PURCHASE_STATUS_STYLE[p.status] ?? ""}`}>{p.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && <Link href={`/admin/expenses/purchases/${p.id}/edit`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</Link>}
            <DownloadPdfButton targetId="purchase-invoice" fileName={p.number} label="Download PDF" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100" />
            <PrintButton label="Print" />
          </div>
        </div>

        {p.status === "Pending" && <p className="no-print rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">Waiting for a Super Admin to approve. Until then it is not recorded as an expense and affects no report.</p>}
        {p.status === "Rejected" && <p className="no-print rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Rejected{p.rejectionReason ? `: ${p.rejectionReason}` : "."} Edit it to send it again for approval.</p>}

        <PurchaseActions id={p.id} status={p.status} isSuperAdmin={admin.role === "SUPER_ADMIN"} />

        <div id="purchase-invoice" className="mx-auto max-w-4xl">
          <CustomerPurchaseInvoice doc={doc} />
        </div>

        <section className="no-print mx-auto max-w-4xl">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Cost against what the customer pays · التكلفة مقابل المحصّل</h3>
          {margin ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AdminStatCard label="Purchase cost" value={formatAed(margin.cost)} valueClassName="text-red-500" hint="What the parts cost us" />
                <AdminStatCard label="Parts billed to customer" value={formatAed(margin.billed)} valueClassName="text-blue-700" hint={`Spare-part lines of invoice ${margin.invoiceNumber}`} />
                <AdminStatCard label="Parts collected" value={formatAed(margin.collected)} valueClassName="text-green-600" hint={`Invoice is ${margin.invoiceStatus}`} />
                <AdminStatCard label="Margin on parts" value={formatAed(margin.marginBilled)} valueClassName={margin.marginBilled < 0 ? "text-red-600" : "text-green-600"} hint={margin.marginPct === null ? "No parts billed" : `${margin.marginPct.toFixed(1)}% of billed · collected margin ${formatAed(margin.marginCollected)}`} />
              </div>
              <p className="mt-2 text-xs text-slate-500">The collected part is the share of the invoice the customer has paid, applied to the parts lines.</p>
            </>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">{p.orderId ? "The service order has no invoice yet, so there is nothing to compare the cost with." : "Link a service order that has an invoice to compare the cost with what the customer is charged."}</p>
          )}
        </section>

        <section className="no-print mx-auto max-w-4xl">
          <h3 className="mb-2 text-base font-semibold text-slate-900">History · السجل</h3>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="text-slate-600">Created by {p.createdBy.name} · {formatDateTimeSlash(p.createdAt)}</div>
            {history.map((h) => (
              <div key={h.id} className="mt-1.5 text-slate-600">
                <b className="capitalize text-slate-900">{h.action}</b> by {h.actorName ?? "—"} · {formatDateTimeSlash(h.createdAt)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
