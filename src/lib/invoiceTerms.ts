import { z } from "zod";
import { TERMS_URL } from "@/lib/invoiceData";

// The Terms & Conditions printed on every invoice, and the Warranty Terms printed on invoices that carry a warranty. Both are bilingual lists the
// owner edits in Settings > Invoice terms; this is the wording used until they save their own.
//
// "{days}" in a line is replaced by the invoice's warranty days. A line that uses it only appears on an invoice that has a warranty.

export type TermPair = { en: string; ar: string };
export type InvoiceTermsConfig = { general: TermPair[]; warranty: TermPair[] };

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
};

export const MAX_TERMS = 30;
export const MAX_TERM_LENGTH = 1500;

const text = z.string().trim().min(1, "Every term needs both an English and an Arabic text.").max(MAX_TERM_LENGTH, `A term can be at most ${MAX_TERM_LENGTH} characters.`);
const pair = z.object({ en: text, ar: text });
const config = z.object({ general: z.array(pair).max(MAX_TERMS, `At most ${MAX_TERMS} terms per list.`), warranty: z.array(pair).max(MAX_TERMS, `At most ${MAX_TERMS} terms per list.`) });

// Checks what the editor sends before it is saved.
export function validateInvoiceTerms(input: unknown): { ok: true; value: InvoiceTermsConfig } | { ok: false; error: string } {
  const parsed = config.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid terms." };
}

// What is stored (or nothing / something unreadable) becomes the terms in use: the owner's own, else the built-in wording.
export function parseInvoiceTerms(stored: unknown): InvoiceTermsConfig {
  const v = validateInvoiceTerms(stored);
  return v.ok ? v.value : DEFAULT_INVOICE_TERMS;
}

export function isDefaultTerms(c: InvoiceTermsConfig): boolean {
  return JSON.stringify(c) === JSON.stringify(DEFAULT_INVOICE_TERMS);
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
    general: c.general.filter((t) => warrantyDays !== null || !usesDays(t)).map(fill),
    warranty: warrantyDays !== null ? c.warranty.map(fill) : [],
  };
}
