import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { getInvoiceTerms } from "@/lib/invoiceTermsDb";
import { isDefaultTerms } from "@/lib/invoiceTerms";
import { InvoiceTermsEditor } from "./InvoiceTermsEditor";

export default async function InvoiceTermsPage() {
  await requireEmployee("ADMIN");
  const config = await getInvoiceTerms();

  return (
    <div className="pb-10">
      <AdminTopBar title="Settings" />
      <div className="px-6 py-6 max-w-4xl">
        <h2 className="text-2xl font-bold text-slate-900">Invoice terms</h2>
        <p className="text-sm text-slate-500 mt-0.5">The Terms &amp; Conditions and Warranty Terms printed on invoices, in English and Arabic. Add, edit, reorder or delete them.</p>
        <div className="mt-6">
          <InvoiceTermsEditor initial={config} isDefault={isDefaultTerms(config)} />
        </div>
      </div>
    </div>
  );
}
