import { Inter } from "next/font/google";
import { LogoImage } from "@/components/LogoImage";
import { formatNumber2, formatDateSlash, formatDateTimeSlash } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/invoiceData";
import { fillLabelDays, type LabelPair } from "@/lib/invoiceLabels";
import type { CrewDisplay } from "@/lib/invoiceCrew";
import { termsWarrantyDays, type WarrantyDisplay } from "@/lib/warranty";
import { DEFAULT_INVOICE_TERMS, termsForInvoice, type InvoiceTermsConfig } from "@/lib/invoiceTerms";
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

const STAMP: Record<PaymentState, { color: string; key: "stampPaid" | "stampUnpaid" | "stampPartial" }> = {
  PAID: { color: "#15803D", key: "stampPaid" },
  UNPAID: { color: "#DC2626", key: "stampUnpaid" },
  "PARTIALLY PAID": { color: "#EA580C", key: "stampPartial" },
};

// One editable word as "English / العربية". The Arabic part gets no letter-spacing (spacing pulls Arabic letters apart so they stop joining)
// and is isolated so brackets inside it stay where they belong. A word left empty in one language prints only the other.
export function Bi({ t, upper = false }: { t: LabelPair; upper?: boolean }) {
  return (
    <>
      {t.en && <span className={upper ? "uppercase" : undefined}>{t.en}</span>}
      {t.en && t.ar && " / "}
      {t.ar && (
        <span className="tracking-normal" dir="rtl" style={{ unicodeBidi: "isolate" }}>
          {t.ar}
        </span>
      )}
    </>
  );
}

const plain = (t: LabelPair) => [t.en, t.ar].filter(Boolean).join(" / ");

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

export function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: React.ReactNode; value: string }) {
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
  title: React.ReactNode;
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
  warranty,
  termsConfig = DEFAULT_INVOICE_TERMS,
  createdByName,
  crew,
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
  warranty: WarrantyDisplay;
  // The Terms & Conditions and Warranty Terms to print (edited in Settings > Invoice terms).
  termsConfig?: InvoiceTermsConfig;
  createdByName: string;
  // The team, its supervisor and the technician, printed in the box beside Bill To.
  crew: CrewDisplay;
  createdAt?: Date;
  collection?: PreviewCollection;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const billToName = customer.type === "COMPANY" ? customer.companyName || customer.name : customer.name;
  const { general: terms, warranty: warrantyTerms, labels: L } = termsForInvoice(termsConfig, termsWarrantyDays(warranty));
  const money = <span className="text-xs text-gray-400"><Bi t={L.currency} /></span>;

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
              <Bi t={L.licenseNo} />: {COMPANY_INFO.license} &nbsp;|&nbsp; <Bi t={L.trn} />: {COMPANY_INFO.trn}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <GlobeIcon />
            <span>{COMPANY_INFO.website}</span>
          </div>
        </div>

        <div className="text-right shrink-0 mx-auto sm:mx-0">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: NAVY }}>
            <Bi t={L.invoice} />
          </div>
          <div className="h-1 w-16 rounded-full mt-1.5 ml-auto" style={{ backgroundColor: BLUE }} />
          <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-gray-200 p-3">
            <InfoRow icon={<DocIcon />} label={<Bi t={L.invoiceNo} />} value={isDraft ? plain(L.draft) : number} />
            <InfoRow icon={<CalendarIcon />} label={<Bi t={L.invoiceDate} />} value={formatDateSlash(date)} />
            <InfoRow icon={<CardIcon />} label={<Bi t={L.trn} />} value={COMPANY_INFO.trn} />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t-2" style={{ borderColor: NAVY }} />

      {/* Bill To / Technician */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard title={<Bi t={L.billTo} />} icon={<PersonIcon />}>
          <div className="font-bold text-gray-900">{billToName}</div>
          {customer.type === "COMPANY" && customer.name && (
            <div className="text-sm text-gray-500 mt-0.5">{customer.name}</div>
          )}
          {customer.trn && (
            <div className="text-sm text-gray-500 mt-0.5">
              <Bi t={L.trn} />: {customer.trn}
            </div>
          )}
          <div className="text-sm text-gray-500 mt-0.5">{customer.phone}</div>
          <div className="text-sm text-gray-500">
            {[customer.buildingName, customer.flatNo, customer.emirate].filter(Boolean).join(", ")}
          </div>
        </InfoCard>
        <InfoCard title={<Bi t={L.team} />} icon={<HardHatIcon />}>
          <div className="font-bold text-gray-900">{crew.teamName ?? "—"}</div>
          {crew.supervisor && (
            <div className="text-sm text-gray-500 mt-0.5">
              <Bi t={L.supervisor} />: <span className="font-semibold text-gray-700">{crew.supervisor}</span>
            </div>
          )}
          {crew.technician && (
            <div className="text-sm text-gray-500 mt-0.5">
              <Bi t={L.technician} />: <span className="font-semibold text-gray-700">{crew.technician.name}</span>
              <span className="text-gray-400">
                {" "}
                (<Bi t={L.idLabel} />: {crew.technician.code})
              </span>
            </div>
          )}
        </InfoCard>
      </div>

      {/* Items table (sm and up) */}
      <div className="mt-6 hidden sm:block rounded-xl border border-gray-200 overflow-x-auto">
        <table data-no-paginate className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-white text-[10px] font-bold tracking-wide whitespace-nowrap" style={{ backgroundColor: NAVY }}>
              <th className="px-3 py-3 text-center w-8">#</th>
              <th className="px-3 py-3 text-left">
                <Bi t={L.description} upper />
              </th>
              <th className="px-3 py-3 text-center">
                <Bi t={L.qty} upper />
              </th>
              <th className="px-3 py-3 text-center">
                <Bi t={L.unit} upper />
              </th>
              <th className="px-3 py-3 text-right">
                <Bi t={L.unitPrice} upper />
              </th>
              <th className="px-3 py-3 text-right">
                <Bi t={L.discount} upper />
              </th>
              <th className="px-3 py-3 text-right">
                <Bi t={L.total} upper />
              </th>
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
                <td className="px-3 py-3 text-center text-gray-600 whitespace-nowrap">
                  <Bi t={L.unitValue} />
                </td>
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
                <div className="text-gray-500">
                  <Bi t={L.qty} />
                </div>
                <div className="text-right text-gray-900">{item.qty}</div>
                <div className="text-gray-500">
                  <Bi t={L.unit} />
                </div>
                <div className="text-right text-gray-900">
                  <Bi t={L.unitValue} />
                </div>
                <div className="text-gray-500">
                  <Bi t={L.unitPrice} />
                </div>
                <div className="text-right text-gray-900">{formatNumber2(item.unitPrice)}</div>
                <div className="text-gray-500">
                  <Bi t={L.discount} />
                </div>
                <div className="text-right text-gray-900">0.00</div>
                <div className="text-gray-700 font-semibold pt-1.5 border-t border-gray-100 mt-1.5">
                  <Bi t={L.total} />
                </div>
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
        <InfoCard title={<Bi t={L.notes} />} icon={<NotesIcon />}>
          {L.thankYou.en && (
            <p className="text-sm text-gray-600">
              {L.thankYou.en.split("OSTA Services.")[0]}
              {L.thankYou.en.includes("OSTA Services.") && (
                <>
                  <span className="font-semibold text-gray-900">OSTA Services.</span>
                  {L.thankYou.en.split("OSTA Services.")[1]}
                </>
              )}
            </p>
          )}
          {L.thankYou.ar && (
            <p className="mt-2 text-sm text-gray-600 text-right" dir="rtl">
              {L.thankYou.ar}
            </p>
          )}
        </InfoCard>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>
                <Bi t={L.subtotal} />
              </span>
              <span>
                {formatNumber2(total)} {money}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>
                <Bi t={L.discountTotal} />
              </span>
              <span>
                0.00 {money}
              </span>
            </div>
          </div>
          <div className="px-4 py-4 flex items-center justify-between text-white" style={{ backgroundColor: NAVY }}>
            <span className="text-sm font-bold tracking-wide">
              <Bi t={L.grandTotal} />
            </span>
            <span className="text-2xl font-extrabold">
              {formatNumber2(total)}{" "}
              <span className="text-sm font-medium">
                <Bi t={L.currency} />
              </span>
            </span>
          </div>
          <div className="p-4 text-xs text-gray-500">
            <Bi t={L.amountInWords} />:
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
          {warranty.kind === "LEGACY" ? (
            <div>
              <div className="text-[10px] font-bold tracking-wide text-gray-500">
                <Bi t={L.warrantyUntil} />
              </div>
              <div className="text-sm font-bold text-gray-900">{formatDateSlash(warranty.until)}</div>
              <div className="text-xs text-gray-400">
                <Bi t={fillLabelDays(L.legacyWarrantyNote, termsWarrantyDays(warranty) ?? 0)} />
              </div>
            </div>
          ) : warranty.kind === "WITH" ? (
            <div>
              <div className="text-[10px] font-bold tracking-wide text-gray-500">
                <Bi t={L.warranty} />
              </div>
              <div className="text-sm font-bold text-gray-900">
                <Bi t={fillLabelDays(L.warrantyDuration, warranty.days)} />
              </div>
              <div className="text-xs text-gray-500">
                <Bi t={L.startDate} />: {warranty.start ? formatDateSlash(warranty.start) : <Bi t={L.pendingStart} />}
              </div>
              <div className="text-xs text-gray-500">
                <Bi t={L.expiryDate} />: {warranty.until ? formatDateSlash(warranty.until) : <Bi t={L.pending} />}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-bold tracking-wide text-gray-500">
                <Bi t={L.warranty} />
              </div>
              <div className="text-sm font-bold text-gray-900">
                <Bi t={L.notIncluded} />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ color: NAVY }}>
            <PersonIcon />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wide text-gray-500">
              <Bi t={L.createdBy} />
            </div>
            <div className="text-sm font-bold text-gray-900">{createdByName}</div>
            <div className="text-xs text-gray-400">{formatDateTimeSlash(createdAt ?? date)}</div>
          </div>
        </div>
      </div>

      {/* Payment method + collection (the stamp sits in the empty middle of this block) */}
      <div className="relative mt-6 border-t border-gray-100 pt-4">
        {collection && (
          <div
            aria-label={`Payment status: ${plain(L[STAMP[collection.state].key])}`}
            className="pointer-events-none absolute left-[60%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-md border-[3px] px-2 py-0.5 text-base font-extrabold tracking-[0.15em] sm:left-1/2 sm:border-[5px] sm:px-6 sm:py-2 sm:text-4xl sm:tracking-[0.2em]"
            style={{ color: STAMP[collection.state].color, borderColor: STAMP[collection.state].color, rotate: "-8deg", opacity: 0.82 }}
          >
            <div>{L[STAMP[collection.state].key].en}</div>
            {L[STAMP[collection.state].key].ar && (
              <div className="text-[0.5em] leading-tight tracking-normal" dir="rtl">
                {L[STAMP[collection.state].key].ar}
              </div>
            )}
          </div>
        )}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">
          <Bi t={L.paymentMethod} />
        </span>
        <span className="font-semibold text-gray-900">{payment}</span>
      </div>
      {collection && (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Bi t={L.paymentStatus} />
            </span>
            <span className="font-bold" style={{ color: STAMP[collection.state].color }}>
              <Bi t={L[STAMP[collection.state].key]} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Bi t={L.paymentDate} />
            </span>
            <span className="font-semibold text-gray-900">
              {collection.paymentDate ? formatDateSlash(collection.paymentDate) : "—"}
              {collection.paymentDate && collection.paymentDateIsEstimate ? " *" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Bi t={L.paidAmount} />
            </span>
            <span className="font-semibold text-gray-900">
              {formatNumber2(collection.received)} {money}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              <Bi t={L.remainingBalance} />
            </span>
            <span className="font-semibold text-gray-900">
              {formatNumber2(collection.remaining)} {money}
            </span>
          </div>
          {collection.paymentDateIsEstimate && (
            <div className="text-[10px] text-gray-400">
              <Bi t={L.collectedAtIssue} />
            </div>
          )}
        </div>
      )}
      </div>

      {/* Warranty terms -- only on invoices that carry a warranty */}
      {warranty.kind === "WITH" && warrantyTerms.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-bold tracking-wide" style={{ color: NAVY }}>
              {termsConfig.titles.warranty.en}
            </div>
            {/* No letter-spacing on Arabic: it pulls the letters apart so they stop joining. */}
            <div className="text-xs font-bold" style={{ color: NAVY }} dir="rtl">
              {termsConfig.titles.warranty.ar}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-2">
              {warrantyTerms.map((term, i) => (
                <p key={i} className="text-xs text-gray-600">
                  {term.en}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-2" dir="rtl">
              {warrantyTerms.map((term, i) => (
                <p key={i} className="text-xs text-gray-600 text-right">
                  {term.ar}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-bold tracking-wide" style={{ color: NAVY }}>
            {termsConfig.titles.general.en}
          </div>
          <div className="text-xs font-bold" style={{ color: NAVY }} dir="rtl">
            {termsConfig.titles.general.ar}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <ol className="flex flex-col gap-2">
            {terms.map((term, i) => (
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
            {terms.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 text-right">
                {/* Number first: in this right-to-left list it sits at the right edge, so the numbers line up and read from the right. */}
                <span
                  className="h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: NAVY }}
                >
                  {i + 1}
                </span>
                <span>{term.ar}</span>
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
