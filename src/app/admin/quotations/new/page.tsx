import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuotationWizard } from "@/components/quotation/QuotationWizard";

export default async function AdminNewQuotationPage() {
  const employee = await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Quotations" />
      <QuotationWizard basePath="/admin" createdByName={employee.name} />
    </div>
  );
}
