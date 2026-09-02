import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatUaePhone } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { InvoicePreviewCard } from "@/components/invoice/InvoicePreviewCard";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";

const T = {
  ar: { downloadPdf: "تحميل PDF" },
  en: { downloadPdf: "Download PDF" },
} as const;

export default async function EmployeeInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, createdBy: true },
  });
  if (!invoice || invoice.createdById !== session!.employeeId) notFound();

  return (
    <div className="pb-10">
      <TopBar title={{ ar: "الفاتورة", en: "Invoice" }} />
      <div className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{invoice.number}</div>
            <div className="text-sm text-slate-500">
              {invoice.customer.type === "COMPANY" ? invoice.customer.companyName : invoice.customer.name}
            </div>
          </div>
          <DownloadPdfButton
            targetId="invoice-preview"
            fileName={invoice.number}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
            label={s.downloadPdf}
          />
        </div>
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
