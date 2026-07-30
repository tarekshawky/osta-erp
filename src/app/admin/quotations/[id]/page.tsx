import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatUaePhone } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuotationPreviewCard } from "@/components/quotation/QuotationPreviewCard";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { DeleteQuotationButton } from "@/components/quotation/DeleteQuotationButton";

export default async function AdminQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true, createdBy: true },
  });
  if (!quotation) notFound();

  return (
    <div className="pb-10">
      <AdminTopBar title="Quotations" />
      <div className="px-6 py-6 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{quotation.number}</div>
            <div className="text-sm text-slate-500">
              {quotation.customerType === "COMPANY" ? quotation.companyName : quotation.customerName}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a
            href={`/admin/quotations/${quotation.id}/edit`}
            className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
            </svg>
            Edit
          </a>
          <DownloadPdfButton
            targetId="quotation-preview"
            fileName={quotation.number}
            className="rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
            label="PDF"
          />
          <DeleteQuotationButton
            quotationId={quotation.id}
            showLabel
            className="w-full rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium py-2.5 flex flex-col items-center gap-1"
          />
        </div>
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
