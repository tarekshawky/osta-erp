import { Inter } from "next/font/google";
import { LogoImage } from "@/components/LogoImage";
import { formatNumber2, formatDateSlash, formatDateTimeSlash } from "@/lib/format";
import { COMPANY_INFO, INVOICE_NOTE, INVOICE_TERMS, WARRANTY_DAYS } from "@/lib/invoiceData";
import { amountInWordsAed } from "@/lib/numberToWords";
import type { PaymentState } from "@/lib/invoicePayment";

export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const NAVY = "#081E4B";
export const BLUE = "#0F5EFF";

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

// How much of the invoice has been collected. Only passed for saved invoices (a draft has no payment state yet).
export type PreviewCollection = {
  state: PaymentState;
  received: number;
  remaining: number;
  paymentDate: Date | null;
  // True when paymentDate is only the invoice date standing in for an old invoice that never recorded one.
  paymentDateIsEstimate?: boolean;
};

const STAMP: Record<PaymentState, { color: string; label: string }> = {
  PAID: { color: "#15803D", label: "PAID" },
  UNPAID: { color: "#DC2626", label: "UNPAID" },
  "PARTIALLY PAID": { color: "#EA580C", label: "PARTIALLY PAID" },
};

export type PreviewItem = {
  serviceName: string;
  description?: string | null;
  qty: number;
  unitPrice: number;
};

export function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

export function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
    </svg>
  );
}

function HardHatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16a8 8 0 0116 0" strokeLinecap="round" />
      <path d="M2 16h20M12 8v-2" strokeLinecap="round" />
    </svg>
  );
}

export function NotesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" strokeLinejoin="round" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0"
        style={{ backgroundColor: NAVY }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[9px] font-bold tracking-wide text-gray-500">{label}</div>
        <div className="text-sm font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

export function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-full text-white flex items-center justify-center shrink-0"
          style={{ backgroundColor: NAVY }}
        >
          {icon}
        </div>
        <div className="text-xs font-bold tracking-wide" style={{ color: NAVY }}>
          {title}
        </div>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export function InvoicePreviewCard({
  number,
  isDraft = false,
  date,
  customer,
  items,
  payment,
  warrantyUntil,
  createdByName,
  createdByCode,
  createdAt,
  collection,
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
  createdByCode?: string;
  createdAt?: Date;
  collection?: PreviewCollection;
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
            INVOICE
          </div>
          <div className="h-1 w-16 rounded-full mt-1.5 ml-auto" style={{ backgroundColor: BLUE }} />
          <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-gray-200 p-3">
            <InfoRow icon={<DocIcon />} label="INVOICE NO." value={isDraft ? "DRAFT" : number} />
            <InfoRow icon={<CalendarIcon />} label="INVOICE DATE" value={formatDateSlash(date)} />
            <InfoRow icon={<CardIcon />} label="TRN" value={COMPANY_INFO.trn} />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t-2" style={{ borderColor: NAVY }} />

      {/* Bill To / Technician */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard title="BILL TO" icon={<PersonIcon />}>
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
        <InfoCard title="TECHNICIAN" icon={<HardHatIcon />}>
          <div className="font-bold text-gray-900">{createdByName}</div>
          {createdByCode && <div className="text-sm text-gray-500 mt-0.5">ID: {createdByCode}</div>}
        </InfoCard>
      </div>

      {/* Items table (sm and up) */}
      <div className="mt-6 hidden sm:block rounded-xl border border-gray-200 overflow-x-auto">
        <table data-no-paginate className="w-full min-w-[640px] text-sm">
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
            {INVOICE_NOTE.en.split("OSTA Services.")[0]}
            <span className="font-semibold text-gray-900">OSTA Services.</span>
            {INVOICE_NOTE.en.split("OSTA Services.")[1]}
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
            <span className="text-sm font-bold tracking-wide">GRAND TOTAL</span>
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

      {/* Warranty / Created By */}
      <div className="mt-6 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <div className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ color: NAVY }}>
            <ShieldIcon />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wide text-gray-500">WARRANTY UNTIL</div>
            <div className="text-sm font-bold text-gray-900">
              {warrantyUntil ? formatDateSlash(warrantyUntil) : "—"}
            </div>
            <div className="text-xs text-gray-400">({WARRANTY_DAYS} Days Warranty)</div>
          </div>
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ color: NAVY }}>
            <PersonIcon />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wide text-gray-500">CREATED BY</div>
            <div className="text-sm font-bold text-gray-900">{createdByName}</div>
            <div className="text-xs text-gray-400">{formatDateTimeSlash(createdAt ?? date)}</div>
          </div>
        </div>
      </div>

      {/* Payment method + collection (the stamp sits in the empty middle of this block) */}
      <div className="relative mt-6 border-t border-gray-100 pt-4">
        {collection && (
          <div
            aria-label={`Payment status: ${STAMP[collection.state].label}`}
            className="pointer-events-none absolute left-[60%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-md border-[3px] px-2 py-0.5 text-base font-extrabold tracking-[0.15em] sm:left-1/2 sm:border-[5px] sm:px-6 sm:py-2 sm:text-4xl sm:tracking-[0.2em]"
            style={{ color: STAMP[collection.state].color, borderColor: STAMP[collection.state].color, rotate: "-8deg", opacity: 0.82 }}
          >
            {STAMP[collection.state].label}
          </div>
        )}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Payment Method</span>
        <span className="font-semibold text-gray-900">{payment}</span>
      </div>
      {collection && (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Status</span>
            <span className="font-bold" style={{ color: STAMP[collection.state].color }}>{STAMP[collection.state].label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Date</span>
            <span className="font-semibold text-gray-900">
              {collection.paymentDate ? formatDateSlash(collection.paymentDate) : "—"}
              {collection.paymentDate && collection.paymentDateIsEstimate ? " *" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Paid Amount</span>
            <span className="font-semibold text-gray-900">AED {formatNumber2(collection.received)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Remaining Balance</span>
            <span className="font-semibold text-gray-900">AED {formatNumber2(collection.remaining)}</span>
          </div>
          {collection.paymentDateIsEstimate && <div className="text-[10px] text-gray-400">* Collected when the invoice was issued.</div>}
        </div>
      )}
      </div>

      {/* Terms & Conditions */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-bold tracking-wide" style={{ color: NAVY }}>
            TERMS &amp; CONDITIONS
          </div>
          <div className="text-xs font-bold tracking-wide" style={{ color: NAVY }} dir="rtl">
            الشروط والأحكام
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <ol className="flex flex-col gap-2">
            {INVOICE_TERMS.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span
                  className="h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: NAVY }}
                >
                  {i + 1}
                </span>
                <span>{term.en}</span>
              </li>
            ))}
          </ol>
          <div className="hidden sm:flex justify-center">
            <div className="h-full w-px bg-gray-200 relative">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-white flex items-center justify-center"
                style={{ backgroundColor: NAVY }}
              >
                <ShieldIcon />
              </div>
            </div>
          </div>
          <ol className="flex flex-col gap-2" dir="rtl">
            {INVOICE_TERMS.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 text-right">
                <span>{term.ar}</span>
                <span
                  className="h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: NAVY }}
                >
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div data-pdf-spacer="true" />

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
