import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";

export default async function AdminNewInvoicePage() {
  const session = await getSession();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session!.employeeId } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <div className="max-w-lg">
        <InvoiceWizard basePath="/admin" createdByName={employee.name} />
      </div>
    </div>
  );
}
