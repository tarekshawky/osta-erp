import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";

export default async function AdminNewInvoicePage() {
  const [employee, teams] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <InvoiceWizard basePath="/admin" createdByName={employee.name} createdByCode={employee.code} teamOptions={teams} />
    </div>
  );
}
