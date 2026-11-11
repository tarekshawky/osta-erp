import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { DEFAULT_INVOICE_TERMS, parseInvoiceTerms, type InvoiceTermsConfig } from "@/lib/invoiceTerms";

// The terms to print on invoices right now: the owner's saved ones, else the built-in wording. An invoice must always be able to show, so a
// failed read (for example the column not added to the database yet) falls back to the built-in wording instead of breaking the page.
export async function getInvoiceTerms(): Promise<InvoiceTermsConfig> {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: SETTING_ID }, select: { invoiceTerms: true } });
    return parseInvoiceTerms(setting?.invoiceTerms);
  } catch (err) {
    console.error("Could not read the invoice terms; using the built-in wording", err);
    return DEFAULT_INVOICE_TERMS;
  }
}
