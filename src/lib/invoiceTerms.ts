import { z } from "zod";
import { TERMS_URL } from "@/lib/invoiceData";
import { DEFAULT_LABELS, LABEL_KEYS, MAX_LABEL_LENGTH, type InvoiceLabels } from "@/lib/invoiceLabels";

// The Terms & Conditions printed on every invoice, and the Warranty Terms printed on invoices that carry a warranty. Both are bilingual lists the
// owner edits in Settings > Invoice terms; this is the wording used until they save their own.
//
// "{days}" in a line is replaced by the invoice's warranty days. A line that uses it only appears on an invoice that has a warranty.

export type TermPair = { en: string; ar: string };
// `titles` are the two headings printed above the lists; `labels` are all the other fixed words on the invoice (see invoiceLabels.ts).
export type InvoiceTermsConfig = { general: TermPair[]; warranty: TermPair[]; titles: { general: TermPair; warranty: TermPair }; labels: InvoiceLabels };

export const DAYS_TOKEN = "{days}";

export const DEFAULT_INVOICE_TERMS: InvoiceTermsConfig = {
  general: [
    {
      en: "The payment for any maintenance is non-refundable under any circumstances.",
      ar: "المبلغ المدفوع لاي صيانة غير قابل للاسترداد تحت أي ظرف من الظروف.",
    },
    {
      en: "The company is responsible only for the work specified in this invoice.",
      ar: "الشركة مسئولة فقط عن العمل المثبت بالفاتورة فقط.",
    },
    {
      en: `Any intervention by another company voids the ${DAYS_TOKEN}-day warranty.`,
      ar: `اي تدخل شركة اخري يسقط ضمان ${DAYS_TOKEN} يوم.`,
    },
    {
      en: "The company is not responsible for misuse or improper handling in case of malfunction.",
      ar: "الشركة غير مسئولة عن سوء الاستخدام او سوء التعامل في حين حدوث عطل.",
    },
    {
      en: `To view the full terms and conditions, please visit: ${TERMS_URL}`,
      ar: `للاطلاع على الشروط والأحكام زر الرابط: ${TERMS_URL}`,
    },
  ],
  warranty: [
    {
      en: "Warranty applies strictly to the specific work performed and services explicitly listed in this invoice. It covers only defects directly related to the workmanship of the completed services during the selected warranty period.",
      ar: "يسري الضمان حصرياً على الأعمال والخدمات التي تم تنفيذها فعلياً والمثبتة بوضوح في هذه الفاتورة، ويغطي فقط العيوب الناتجة مباشرة عن جودة تنفيذ الأعمال المشمولة بالضمان، وذلك خلال فترة الضمان المحددة.",
    },
    {
      en: "This warranty does not cover any other faults, breakdowns, defects, or problems outside the scope of the work performed and listed in this invoice. It does not cover unrelated components, newly developed issues, misuse, physical damage, or external factors.",
      ar: "لا يشمل الضمان أي أعطال أو تلفيات أو مشاكل أخرى خارج نطاق الأعمال المنفذة والمذكورة في الفاتورة، كما لا يشمل الأعطال غير المرتبطة بالخدمة المقدمة أو سوء الاستخدام أو الأضرار الناتجة عن عوامل خارجية.",
    },
    {
      en: "Any additional work, repairs, replacement parts, or services not specified in this invoice are excluded from this warranty and may be charged separately.",
      ar: "أي أعمال إضافية أو إصلاحات أو قطع غيار أو خدمات غير موضحة في هذه الفاتورة لا تدخل ضمن هذا الضمان، ويتم احتسابها بشكل منفصل عند الحاجة.",
    },
  ],
  titles: {
    general: { en: "TERMS & CONDITIONS", ar: "الشروط والأحكام" },
    warranty: { en: "WARRANTY TERMS & CONDITIONS", ar: "شروط وأحكام الضمان" },
  },
  labels: DEFAULT_LABELS,
};

export const MAX_TERMS = 30;
export const MAX_TERM_LENGTH = 1500;

const text = z.string().trim().min(1, "Every term needs both an English and an Arabic text.").max(MAX_TERM_LENGTH, `A term can be at most ${MAX_TERM_LENGTH} characters.`);
const pair = z.object({ en: text, ar: text });
const title = z.string().trim().min(1, "Every heading needs both an English and an Arabic text.").max(80, "A heading can be at most 80 characters.");
const titlePair = z.object({ en: title, ar: title });
// Terms saved before the headings were editable have no titles: they get the original headings.
// A word may be left empty in one language (then only the other prints), but not in both.
const labelText = z.string().trim().max(MAX_LABEL_LENGTH, `A word can be at most ${MAX_LABEL_LENGTH} characters.`);
const labelPair = z.object({ en: labelText, ar: labelText }).refine((p) => p.en !== "" || p.ar !== "", "Every word needs an English or an Arabic text.");
// Anything not saved yet (older saves, words added later) keeps its original wording.
const labels = z.object(Object.fromEntries(LABEL_KEYS.map((k) => [k, labelPair.optional()]))).default({});
const config = z.object({
  general: z.array(pair).max(MAX_TERMS, `At most ${MAX_TERMS} terms per list.`),
  warranty: z.array(pair).max(MAX_TERMS, `At most ${MAX_TERMS} terms per list.`),
  titles: z.object({ general: titlePair, warranty: titlePair }).default(DEFAULT_INVOICE_TERMS.titles),
  labels,
});

// Checks what the editor sends before it is saved.
export function validateInvoiceTerms(input: unknown): { ok: true; value: InvoiceTermsConfig } | { ok: false; error: string } {
  const parsed = config.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid terms." };
  const saved = parsed.data.labels as Partial<InvoiceLabels>;
  return { ok: true, value: { ...parsed.data, labels: { ...DEFAULT_LABELS, ...saved } } };
}

// What is stored (or nothing / something unreadable) becomes the terms in use: the owner's own, else the built-in wording.
export function parseInvoiceTerms(stored: unknown): InvoiceTermsConfig {
  const v = validateInvoiceTerms(stored);
  return v.ok ? v.value : DEFAULT_INVOICE_TERMS;
}

export function isDefaultTerms(c: InvoiceTermsConfig): boolean {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return (
    same(c.general, DEFAULT_INVOICE_TERMS.general) &&
    same(c.warranty, DEFAULT_INVOICE_TERMS.warranty) &&
    same(c.titles, DEFAULT_INVOICE_TERMS.titles) &&
    LABEL_KEYS.every((k) => same(c.labels[k], DEFAULT_INVOICE_TERMS.labels[k]))
  );
}

const usesDays = (t: TermPair) => t.en.includes(DAYS_TOKEN) || t.ar.includes(DAYS_TOKEN);

// The terms for one invoice: "{days}" filled in, lines that need a warranty left out when there is none, and the Warranty Terms only when
// there is one. `warrantyDays` is null for an invoice with no warranty.
export function termsForInvoice(c: InvoiceTermsConfig, warrantyDays: number | null): InvoiceTermsConfig {
  const fill = (t: TermPair): TermPair => ({
    en: t.en.split(DAYS_TOKEN).join(String(warrantyDays)),
    ar: t.ar.split(DAYS_TOKEN).join(String(warrantyDays)),
  });
  return {
    titles: c.titles,
    labels: c.labels,
    general: c.general.filter((t) => warrantyDays !== null || !usesDays(t)).map(fill),
    warranty: warrantyDays !== null ? c.warranty.map(fill) : [],
  };
}
