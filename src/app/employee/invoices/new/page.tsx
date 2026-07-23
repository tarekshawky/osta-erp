import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";

export default async function NewInvoicePage() {
  const session = await getSession();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session!.employeeId } });

  return (
    <div className="pb-8">
      <TopBar title="Invoices" />
      <InvoiceWizard basePath="/employee" createdByName={employee.name} />
    </div>
  );
}
