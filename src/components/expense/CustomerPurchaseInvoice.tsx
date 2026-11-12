import { LogoImage } from "@/components/LogoImage";
import { COMPANY_INFO } from "@/lib/invoiceData";
import { formatAed, formatDateSlash, formatNumber2 } from "@/lib/format";
import { inter, NAVY, BLUE } from "@/components/invoice/InvoicePreviewCard";

// "OSTA Services – Customer Materials Purchase Invoice": the printable / PDF document of a purchase. English first with
// Arabic beside it. The page's Download PDF and Print use this exact element.
export type PurchaseDoc = {
  number: string; status: string; purchaseDate: Date; customerName: string; customerCode: string; orderNumber: string | null; invoiceNumber: string | null;
  teamName: string | null; technicianName: string | null; emirate: string | null; supplierName: string | null; supplierInvoiceNo: string | null; paymentMethod: string;
  notes: string | null; supplierInvoiceUrl: string | null; total: number; approvedByName: string | null; approvedAt: Date | null; createdByName: string;
  items: { name: string; description: string | null; qty: number; unitPrice: number; total: number }[];
};

const STAMP: Record<string, { color: string; label: string }> = {
  Approved: { color: "#15803D", label: "APPROVED" },
  Pending: { color: "#EA580C", label: "PENDING APPROVAL" },
  Rejected: { color: "#DC2626", label: "REJECTED" },
};

function Info({ en, ar, value }: { en: string; ar: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-2">
      <div className="flex justify-between gap-2 text-[10px] font-bold tracking-wide text-gray-400">
        <span>{en.toUpperCase()}</span>
        <span dir="rtl">{ar}</span>
      </div>
      <div className="mt-0.5 text-sm font-semibold text-gray-900">{value || "—"}</div>
    </div>
  );
}

export function CustomerPurchaseInvoice({ doc, innerRef }: { doc: PurchaseDoc; innerRef?: React.Ref<HTMLDivElement> }) {
  const stamp = STAMP[doc.status] ?? STAMP.Pending;
  const isImage = doc.supplierInvoiceUrl?.startsWith("data:image");
  return (
    <div ref={innerRef} className={`${inter.className} relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-8`}>
      <svg width="70" height="70" viewBox="0 0 70 70" className="absolute -left-px -top-px">
        <path d="M0 0H70L0 70V0Z" fill={BLUE} />
        <path d="M0 0H45L0 45V0Z" fill={NAVY} />
      </svg>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 pl-6">
          <LogoImage className="h-14 w-auto sm:h-20" />
          <div className="mt-1 text-xs font-bold tracking-[0.35em]" style={{ color: NAVY }}>SERVICES</div>
          <div className="mt-2 text-xs text-gray-600">{COMPANY_INFO.name}</div>
          <div className="text-xs text-gray-500">TRN: {COMPANY_INFO.trn}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold sm:text-2xl" style={{ color: NAVY }}>CUSTOMER MATERIALS</div>
          <div className="text-xl font-extrabold sm:text-2xl" style={{ color: NAVY }}>PURCHASE INVOICE</div>
          <div className="mt-1 text-sm font-bold text-gray-700" dir="rtl">فاتورة شراء بضاعة لحساب العميل</div>
          <div className="mt-3 inline-block rounded-lg px-4 py-2 text-left" style={{ background: NAVY }}>
            <div className="text-[10px] font-bold tracking-wide text-blue-200">PURCHASE NO.</div>
            <div className="text-base font-bold text-white">{doc.number}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <span className="rounded-md border-[3px] px-3 py-1 text-sm font-extrabold tracking-[0.15em]" style={{ color: stamp.color, borderColor: stamp.color, transform: "rotate(-4deg)", opacity: 0.85 }}>
          {stamp.label}
        </span>
      </div>

      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <div>
          <Info en="Customer" ar="العميل" value={doc.customerName} />
          <Info en="Customer ID" ar="رقم العميل" value={doc.customerCode} />
          <Info en="Service order" ar="رقم أمر الخدمة" value={doc.orderNumber} />
          <Info en="Invoice number" ar="رقم الفاتورة" value={doc.invoiceNumber} />
          <Info en="Emirate" ar="الإمارة" value={doc.emirate} />
        </div>
        <div>
          <Info en="Purchase date" ar="تاريخ الشراء" value={formatDateSlash(doc.purchaseDate)} />
          <Info en="Technician / team" ar="الفني / الفريق" value={[doc.technicianName, doc.teamName].filter(Boolean).join(" — ")} />
          <Info en="Supplier" ar="المورد" value={doc.supplierName} />
          <Info en="Supplier invoice no." ar="رقم فاتورة المورد" value={doc.supplierInvoiceNo} />
          <Info en="Payment method" ar="طريقة الدفع" value={doc.paymentMethod === "Ziina" ? "Zina" : doc.paymentMethod} />
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: NAVY }} className="text-left text-white">
              <th className="px-3 py-2.5 text-xs font-semibold">#</th>
              <th className="px-3 py-2.5 text-xs font-semibold">ITEM · القطعة</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold">QTY · الكمية</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold">UNIT PRICE · السعر</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold">TOTAL · الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2.5 text-gray-900">
                  <div className="font-medium">{it.name}</div>
                  {it.description && <div className="text-xs text-gray-500">{it.description}</div>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber2(it.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatNumber2(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs rounded-lg px-4 py-3 text-white" style={{ background: NAVY }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-wide">TOTAL · <span className="tracking-normal">الإجمالي النهائي</span></span>
            <span className="text-lg font-bold">{formatAed(doc.total)}</span>
          </div>
        </div>
      </div>

      {doc.notes && (
        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="text-xs font-bold text-gray-400">NOTES · ملاحظات: </span>
          {doc.notes}
        </div>
      )}

      {isImage && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-bold tracking-wide text-gray-400">ORIGINAL SUPPLIER INVOICE · <span className="tracking-normal">فاتورة المورد الأصلية</span></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doc.supplierInvoiceUrl!} alt="Original supplier invoice" className="max-h-80 w-auto rounded-lg border border-gray-200" />
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="h-12 border-b border-gray-400" />
          <div className="mt-1 text-xs text-gray-500">Technician / team · الفني أو الفريق: {doc.technicianName ?? doc.teamName ?? doc.createdByName}</div>
        </div>
        <div>
          <div className="flex h-12 items-end border-b border-gray-400 pb-1 text-sm font-semibold text-gray-800">
            {doc.status === "Approved" && doc.approvedByName ? `${doc.approvedByName} — ${doc.approvedAt ? formatDateSlash(doc.approvedAt) : ""}` : ""}
          </div>
          <div className="mt-1 text-xs text-gray-500">Approved by · اعتماد المسؤول</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-lg px-4 py-3 text-xs text-white" style={{ background: NAVY }}>
        <span>{COMPANY_INFO.phone}</span>
        <span>{COMPANY_INFO.email}</span>
        <span>{COMPANY_INFO.website}</span>
        <span>{COMPANY_INFO.address}</span>
      </div>
    </div>
  );
}
