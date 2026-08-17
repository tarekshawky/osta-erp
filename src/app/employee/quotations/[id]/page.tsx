import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatUaePhone } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { QuotationPreviewCard } from "@/components/quotation/QuotationPreviewCard";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";

export default async function EmployeeQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true, createdBy: true },
  });
  if (!quotation || quotation.createdById !== session!.employeeId) notFound();

  return (
    <div className="pb-10">
      <TopBar title="Quotation" />
      <div className="px-5 py-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{quotation.number}</div>
            <div className="text-sm text-slate-500">
              {quotation.customerType === "COMPANY" ? quotation.companyName : quotation.customerName}
            </div>
          </div>
          <DownloadPdfButton
            targetId="quotation-preview"
            fileName={quotation.number}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
            label="Download PDF"
          />
        </div>

        {/* Plain <a>, not next/link: forces a full navigation so the invoice wizard
            always gets a fresh server render with this quotationId -- a client-side
            Link here can serve a stale prefetch of /employee/invoices/new (without
            the query param) picked up from the dashboard's "Create Invoice" tile. */}
        <a
          href={quotation.invoiceId ? `/employee/invoices/${quotation.invoiceId}` : `/employee/invoices/new?quotationId=${quotation.id}`}
          className="w-full rounded-xl bg-green-600 text-white font-medium text-sm py-3 text-center block"
        >
          {quotation.invoiceId ? "View Invoice" : "Convert to Invoice"}
        </a>
      </div>

      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-slate-100 py-6 px-2 sm:px-4 lg:px-10">
        <div id="quotation-preview" className="max-w-3xl lg:max-w-6xl mx-auto">
          <QuotationPreviewCard
            number={quotation.number}
            date={quotation.date}
            customer={{
              type: quotation.customerType,
              name: quotation.customerName,
              companyName: quotation.companyName,
              trn: quotation.trn,
              phone: formatUaePhone(quotation.phone ?? ""),
              emirate: quotation.emirate ?? "",
              buildingName: quotation.buildingName,
              flatNo: quotation.flatNo,
            }}
            items={quotation.items}
            createdByName={quotation.createdBy.name}
          />
        </div>
      </div>
    </div>
  );
}
