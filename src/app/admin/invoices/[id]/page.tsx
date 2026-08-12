import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatUaePhone, formatDateTimeSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoicePreviewCard } from "@/components/invoice/InvoicePreviewCard";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { DeleteInvoiceButton } from "@/components/invoice/DeleteInvoiceButton";
import { RefundModal } from "@/components/invoice/RefundModal";
import { InvoiceStatusControl } from "@/components/invoice/InvoiceStatusControl";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      createdBy: true,
      statusChanges: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
    },
  });
  if (!invoice) notFound();
  const canToggleStatus = invoice.status === "Paid" || invoice.status === "Unpaid";

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <div className="px-6 py-6 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{invoice.number}</div>
            <div className="text-sm text-slate-500">
              {invoice.customer.type === "COMPANY" ? invoice.customer.companyName : invoice.customer.name}
            </div>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <a
            href={`/admin/invoices/${invoice.id}/edit`}
            className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
            </svg>
            Edit
          </a>
          <DownloadPdfButton
            targetId="invoice-preview"
            fileName={invoice.number}
            className="rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
            label="PDF"
          />
          <DeleteInvoiceButton
            invoiceId={invoice.id}
            className="w-full rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
          />
          <RefundModal
            invoiceId={invoice.id}
            amount={invoice.amount}
            refundedAmount={invoice.refundedAmount}
            disabled={invoice.status === "Refunded"}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium py-2.5 flex flex-col items-center gap-1 disabled:opacity-40"
          />
        </div>

        {canToggleStatus && (
          <div className="mt-4">
            <InvoiceStatusControl invoiceId={invoice.id} currentStatus={invoice.status} />
          </div>
        )}

        {invoice.statusChanges.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Status History</h3>
            <div className="flex flex-col gap-2">
              {invoice.statusChanges.map((change) => (
                <div key={change.id} className="text-sm">
                  <span className="font-medium text-slate-900">
                    {change.previousStatus} → {change.newStatus}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    · {change.changedBy.name} · {formatDateTimeSlash(change.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-slate-100 py-6 px-2 sm:px-4 lg:px-10">
        <div id="invoice-preview" className="max-w-3xl lg:max-w-6xl mx-auto">
          <InvoicePreviewCard
            number={invoice.number}
            date={invoice.date}
            customer={{
              type: invoice.customer.type,
              name: invoice.customer.name,
              companyName: invoice.customer.companyName,
              trn: invoice.customer.trn,
              phone: formatUaePhone(invoice.customer.phone),
              emirate: invoice.customer.emirate,
              buildingName: invoice.customer.buildingName,
              flatNo: invoice.customer.flatNo,
            }}
            items={invoice.items}
            payment={invoice.payment}
            warrantyUntil={invoice.warrantyUntil}
            createdByName={invoice.createdBy.name}
            createdByCode={invoice.createdBy.code}
            createdAt={invoice.createdAt}
          />
        </div>
      </div>
    </div>
  );
}
