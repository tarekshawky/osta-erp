import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";

export default async function AdminNewInvoicePage() {
  const employee = await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <div className="max-w-lg">
        <InvoiceWizard basePath="/admin" createdByName={employee.name} />
      </div>
    </div>
  );
}
