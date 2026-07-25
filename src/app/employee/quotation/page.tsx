import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { QuotationWizard } from "@/components/quotation/QuotationWizard";

export default async function QuotationPage() {
  const employee = await requireEmployee("EMPLOYEE");

  return (
    <div className="pb-8">
      <TopBar title="Quotation" />
      <QuotationWizard createdByName={employee.name} />
    </div>
  );
}
