// Every fixed word printed on an invoice (headings, table columns, totals, warranty and payment lines), each with an English and an Arabic text.
// The owner edits them in Settings > Invoice terms & words; this is the wording used until they do. On the invoice each prints as "English / العربية".
//
// "{days}" in a word is replaced by the invoice's warranty days.

export type LabelPair = { en: string; ar: string };

export const LABEL_GROUPS = [
  {
    title: "Header",
    keys: [
      ["invoice", "INVOICE", "فاتورة"],
      ["invoiceNo", "INVOICE NO.", "رقم الفاتورة"],
      ["invoiceDate", "INVOICE DATE", "تاريخ الفاتورة"],
      ["trn", "TRN", "الرقم الضريبي"],
      ["licenseNo", "License No", "رقم الرخصة"],
      ["draft", "DRAFT", "مسودة"],
    ],
  },
  {
    title: "Customer and team",
    keys: [
      ["billTo", "BILL TO", "فاتورة إلى"],
      ["team", "TEAM", "الفريق"],
      ["supervisor", "Supervisor", "المشرف"],
      ["technician", "Technician", "الفني"],
      ["idLabel", "ID", "الرقم الوظيفي"],
    ],
  },
  {
    title: "Items table",
    keys: [
      ["description", "Description", "الوصف"],
      ["qty", "Qty", "الكمية"],
      ["unit", "Unit", "الوحدة"],
      ["unitValue", "Unit", "وحدة"],
      ["unitPrice", "Unit Price (AED)", "سعر الوحدة (د.إ)"],
      ["discount", "Discount (AED)", "الخصم (د.إ)"],
      ["total", "Total (AED)", "الإجمالي (د.إ)"],
    ],
  },
  {
    title: "Notes and totals",
    keys: [
      ["notes", "NOTES", "ملاحظات"],
      [
        "thankYou",
        "Thank you for choosing OSTA Services. We appreciate your trust and look forward to serving you again.",
        "شكرًا لاختياركم خدمات أسطا. نقدّر ثقتكم ونتطلع لخدمتكم مجددًا.",
      ],
      ["subtotal", "SUBTOTAL", "المجموع الفرعي"],
      ["discountTotal", "DISCOUNT", "الخصم"],
      ["grandTotal", "GRAND TOTAL", "الإجمالي النهائي"],
      ["amountInWords", "Amount in Words", "المبلغ بالحروف"],
      ["currency", "AED", "د.إ"],
    ],
  },
  {
    title: "Warranty",
    keys: [
      ["warranty", "WARRANTY", "الضمان"],
      ["warrantyUntil", "WARRANTY UNTIL", "الضمان حتى"],
      ["warrantyDuration", "{days} Days", "{days} يوم"],
      ["legacyWarrantyNote", "({days} Days Warranty)", "(ضمان {days} يوم)"],
      ["startDate", "Start Date", "تاريخ البدء"],
      ["expiryDate", "Expiry Date", "تاريخ الانتهاء"],
      ["pending", "Pending", "معلّق"],
      ["pendingStart", "Pending (work not completed)", "معلّق (لم يكتمل العمل)"],
      ["notIncluded", "Not Included", "بدون ضمان"],
      ["createdBy", "CREATED BY", "أنشئت بواسطة"],
    ],
  },
  {
    title: "Payment",
    keys: [
      ["paymentMethod", "Payment Method", "طريقة الدفع"],
      ["paymentStatus", "Payment Status", "حالة الدفع"],
      ["paymentDate", "Payment Date", "تاريخ الدفع"],
      ["paidAmount", "Paid Amount", "المبلغ المدفوع"],
      ["remainingBalance", "Remaining Balance", "المبلغ المتبقي"],
      ["collectedAtIssue", "* Collected when the invoice was issued.", "* تم التحصيل عند إصدار الفاتورة."],
      ["stampPaid", "PAID", "مدفوعة"],
      ["stampUnpaid", "UNPAID", "غير مدفوعة"],
      ["stampPartial", "PARTIALLY PAID", "مدفوعة جزئياً"],
    ],
  },
] as const;

type Row = (typeof LABEL_GROUPS)[number]["keys"][number];
export type LabelKey = Row[0];

export const LABEL_KEYS: LabelKey[] = LABEL_GROUPS.flatMap((g) => g.keys.map((k) => k[0]));

export const DEFAULT_LABELS = Object.fromEntries(
  LABEL_GROUPS.flatMap((g) => g.keys.map(([key, en, ar]) => [key, { en, ar }]))
) as Record<LabelKey, LabelPair>;

export type InvoiceLabels = Record<LabelKey, LabelPair>;

export const MAX_LABEL_LENGTH = 300;

// The warranty days filled into a word that has "{days}".
export function fillLabelDays(label: LabelPair, days: number): LabelPair {
  return { en: label.en.split("{days}").join(String(days)), ar: label.ar.split("{days}").join(String(days)) };
}
