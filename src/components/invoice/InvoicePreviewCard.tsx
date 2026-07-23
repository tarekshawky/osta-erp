import { OstaLogo } from "@/components/OstaLogo";
import { formatAed, formatDate } from "@/lib/format";
import { COMPANY_INFO, TERMS_AND_CONDITIONS, TERMS_URL } from "@/lib/invoiceData";

export type PreviewCustomer = {
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  companyName?: string | null;
  trn?: string | null;
  phone: string;
  emirate: string;
  buildingName?: string | null;
  flatNo?: string | null;
};

export type PreviewItem = {
  serviceName: string;
  description?: string | null;
  qty: number;
  unitPrice: number;
};

export function InvoicePreviewCard({
  number,
  isDraft = false,
  date,
  customer,
  items,
  payment,
  warrantyUntil,
  createdByName,
  innerRef,
}: {
  number: string;
  isDraft?: boolean;
  date: Date;
  customer: PreviewCustomer;
  items: PreviewItem[];
  payment: string;
  warrantyUntil?: Date | null;
  createdByName: string;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const billToName = customer.type === "COMPANY" ? customer.companyName || customer.name : customer.name;

  return (
    <div ref={innerRef} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <OstaLogo compact align="left" />
        <div className="text-right">
          <div className="font-bold text-slate-900">INVOICE</div>
          <div className="text-xs text-slate-500 mt-1">{isDraft ? "DRAFT" : number}</div>
          <div className="text-xs text-slate-500">{formatDate(date).split("-").reverse().join("/")}</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 space-y-0.5">
        <div className="font-semibold text-slate-700 text-sm">{COMPANY_INFO.name}</div>
        <div>{COMPANY_INFO.email}</div>
        <div>TRN: {COMPANY_INFO.trn}</div>
        <div>License: {COMPANY_INFO.license}</div>
        <div>{COMPANY_INFO.website}</div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-400 tracking-wide">BILL TO</div>
        <div className="font-bold text-slate-900 mt-1">{billToName}</div>
        {customer.type === "COMPANY" && customer.name && (
          <div className="text-sm text-slate-600">{customer.name}</div>
        )}
        {customer.type === "COMPANY" && customer.trn && (
          <div className="text-sm text-slate-500">TRN: {customer.trn}</div>
        )}
        <div className="text-sm text-slate-600">{customer.phone}</div>
        <div className="text-sm text-slate-600">{customer.emirate}</div>
        {customer.buildingName && <div className="text-sm text-slate-600">{customer.buildingName}</div>}
        {customer.flatNo && <div className="text-sm text-slate-600">{customer.flatNo}</div>}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-[1fr_60px_100px_100px] gap-2 text-xs font-medium text-slate-400 tracking-wide pb-2 border-b border-slate-100">
          <span>DESCRIPTION</span>
          <span className="text-center">QTY</span>
          <span className="text-right">UNIT PRICE</span>
          <span className="text-right">AMOUNT</span>
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_100px_100px] gap-2 py-2 text-sm border-b border-slate-50 last:border-0">
            <div>
              <div className="text-slate-900">{item.serviceName}</div>
              {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
            </div>
            <span className="text-center text-slate-600">{item.qty}</span>
            <span className="text-right text-slate-600">{formatAed(item.unitPrice)}</span>
            <span className="text-right font-medium text-slate-900">{formatAed(item.qty * item.unitPrice)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-col items-end gap-1 text-sm">
        <div className="flex justify-between w-48 text-slate-600">
          <span>Subtotal</span>
          <span>{formatAed(total)}</span>
        </div>
        <div className="flex justify-between w-48 font-bold text-slate-900">
          <span>Total</span>
          <span className="text-blue-700">{formatAed(total)}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Method</span>
          <span className="text-slate-900">{payment}</span>
        </div>
        {warrantyUntil && (
          <div className="flex justify-between">
            <span className="text-slate-500">Warranty Until</span>
            <span className="text-slate-900">{formatDate(warrantyUntil)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Created By</span>
          <span className="text-slate-900">{createdByName}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="font-semibold text-slate-700 text-sm">Terms &amp; Conditions</div>
        <ul className="mt-1 text-xs text-slate-500 space-y-0.5">
          {TERMS_AND_CONDITIONS.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
        <div className="mt-1 text-xs text-blue-600">{TERMS_URL}</div>
      </div>
    </div>
  );
}
