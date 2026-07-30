import { LogoImage } from "@/components/LogoImage";
import { formatNumber2, formatDateSlash } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/invoiceData";
import { amountInWordsAed } from "@/lib/numberToWords";
import type { PreviewCustomer, PreviewItem } from "@/components/invoice/InvoicePreviewCard";
import {
  inter,
  NAVY,
  BLUE,
  DocIcon,
  CalendarIcon,
  CardIcon,
  PersonIcon,
  GlobeIcon,
  PhoneIcon,
  MailIcon,
  PinIcon,
  NotesIcon,
  InfoRow,
  InfoCard,
} from "@/components/invoice/InvoicePreviewCard";

export function QuotationPreviewCard({
  number,
  isDraft = false,
  date,
  customer,
  items,
  createdByName,
  innerRef,
}: {
  number: string;
  isDraft?: boolean;
  date: Date;
  customer: PreviewCustomer;
  items: PreviewItem[];
  createdByName: string;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const billToName = customer.type === "COMPANY" ? customer.companyName || customer.name : customer.name;

  return (
    <div
      ref={innerRef}
      className={`${inter.className} relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 sm:p-8`}
    >
      <svg width="70" height="70" viewBox="0 0 70 70" className="absolute -left-px -top-px">
        <path d="M0 0H70L0 70V0Z" fill={BLUE} />
        <path d="M0 0H45L0 45V0Z" fill={NAVY} />
      </svg>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
          <LogoImage className="h-14 sm:h-24 lg:h-28 w-auto" />
          <div className="text-xs font-bold tracking-[0.35em] mt-1.5" style={{ color: NAVY }}>
            SERVICES
          </div>
          <div className="mt-3 sm:mt-6 text-base font-bold text-gray-900">{COMPANY_INFO.name}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
            <DocIcon />
            <span>
              License No: {COMPANY_INFO.license} &nbsp;|&nbsp; TRN: {COMPANY_INFO.trn}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <GlobeIcon />
            <span>{COMPANY_INFO.website}</span>
          </div>
        </div>

        <div className="text-right shrink-0 mx-auto sm:mx-0">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: NAVY }}>
            QUOTATION
          </div>
          <div className="h-1 w-16 rounded-full mt-1.5 ml-auto" style={{ backgroundColor: BLUE }} />
          <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-gray-200 p-3">
            <InfoRow icon={<DocIcon />} label="QUOTATION NO." value={isDraft ? "DRAFT" : number} />
            <InfoRow icon={<CalendarIcon />} label="QUOTATION DATE" value={formatDateSlash(date)} />
            <InfoRow icon={<CardIcon />} label="TRN" value={COMPANY_INFO.trn} />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t-2" style={{ borderColor: NAVY }} />

      {/* Prepared For / Prepared By */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard title="PREPARED FOR" icon={<PersonIcon />}>
          <div className="font-bold text-gray-900">{billToName}</div>
          {customer.type === "COMPANY" && customer.name && (
            <div className="text-sm text-gray-500 mt-0.5">{customer.name}</div>
          )}
          {customer.trn && <div className="text-sm text-gray-500 mt-0.5">TRN: {customer.trn}</div>}
          <div className="text-sm text-gray-500 mt-0.5">{customer.phone}</div>
          <div className="text-sm text-gray-500">
            {[customer.buildingName, customer.flatNo, customer.emirate].filter(Boolean).join(", ")}
          </div>
        </InfoCard>
        <InfoCard title="PREPARED BY" icon={<PersonIcon />}>
          <div className="font-bold text-gray-900">{createdByName}</div>
        </InfoCard>
      </div>

      {/* Items table (sm and up) */}
      <div className="mt-6 hidden sm:block rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-white text-[10px] font-bold tracking-wide whitespace-nowrap" style={{ backgroundColor: NAVY }}>
              <th className="px-3 py-3 text-center w-8">#</th>
              <th className="px-3 py-3 text-left">DESCRIPTION</th>
              <th className="px-3 py-3 text-center">QTY</th>
              <th className="px-3 py-3 text-center">UNIT</th>
              <th className="px-3 py-3 text-right">UNIT PRICE (AED)</th>
              <th className="px-3 py-3 text-right">DISCOUNT (AED)</th>
              <th className="px-3 py-3 text-right">TOTAL (AED)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-3 text-center text-gray-500">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-gray-900">{item.serviceName}</div>
                  {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                </td>
                <td className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">{item.qty}</td>
                <td className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">Unit</td>
                <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">{formatNumber2(item.unitPrice)}</td>
                <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">0.00</td>
                <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                  {formatNumber2(item.qty * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Items list (mobile only) -- stacked cards so every detail is visible without scrolling */}
      <div className="mt-6 sm:hidden space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 text-white text-xs font-semibold flex items-center gap-2" style={{ backgroundColor: NAVY }}>
              <span>#{i + 1}</span>
              <span className="truncate">{item.serviceName}</span>
            </div>
            <div className="p-3">
              {item.description && <div className="text-xs text-gray-500 mb-2">{item.description}</div>}
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div className="text-gray-500">Qty</div>
                <div className="text-right text-gray-900">{item.qty}</div>
                <div className="text-gray-500">Unit</div>
                <div className="text-right text-gray-900">Unit</div>
                <div className="text-gray-500">Unit Price (AED)</div>
                <div className="text-right text-gray-900">{formatNumber2(item.unitPrice)}</div>
                <div className="text-gray-500">Discount (AED)</div>
                <div className="text-right text-gray-900">0.00</div>
                <div className="text-gray-700 font-semibold pt-1.5 border-t border-gray-100 mt-1.5">Total (AED)</div>
                <div className="text-right font-bold text-gray-900 pt-1.5 border-t border-gray-100 mt-1.5">
                  {formatNumber2(item.qty * item.unitPrice)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes + Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <InfoCard title="NOTES" icon={<NotesIcon />}>
          <p className="text-sm text-gray-600">
            This is a price estimate, not an invoice. Prices are subject to change upon inspection.
          </p>
        </InfoCard>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>SUBTOTAL</span>
              <span>
                {formatNumber2(total)} <span className="text-xs text-gray-400">AED</span>
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>DISCOUNT</span>
              <span>
                0.00 <span className="text-xs text-gray-400">AED</span>
              </span>
            </div>
          </div>
          <div className="px-4 py-4 flex items-center justify-between text-white" style={{ backgroundColor: NAVY }}>
            <span className="text-sm font-bold tracking-wide">ESTIMATED TOTAL</span>
            <span className="text-2xl font-extrabold">
              {formatNumber2(total)} <span className="text-sm font-medium">AED</span>
            </span>
          </div>
          <div className="p-4 text-xs text-gray-500">
            Amount in Words:
            <div className="font-semibold text-gray-900 mt-0.5">{amountInWordsAed(total)}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-6 -mx-3 sm:-mx-8 -mb-3 sm:-mb-8 px-3 sm:px-8 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white text-xs"
        style={{ backgroundColor: NAVY }}
      >
        <span className="flex items-center gap-1.5">
          <PhoneIcon /> {COMPANY_INFO.phone}
        </span>
        <span className="flex items-center gap-1.5">
          <MailIcon /> {COMPANY_INFO.email}
        </span>
        <span className="flex items-center gap-1.5">
          <GlobeIcon /> {COMPANY_INFO.website}
        </span>
        <span className="flex items-center gap-1.5">
          <PinIcon /> {COMPANY_INFO.address}
        </span>
      </div>
    </div>
  );
}
