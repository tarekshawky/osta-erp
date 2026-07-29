import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";

export default async function NewInvoicePage() {
  const employee = await requireEmployee("EMPLOYEE");

  return (
    <div className="pb-8">
      <TopBar title="Invoices" />
      <InvoiceWizard basePath="/employee" createdByName={employee.name} createdByCode={employee.code} />
    </div>
  );
}
