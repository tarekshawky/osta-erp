import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import type { CustomerFormData } from "@/components/invoice/types";

export default async function AdminNewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const [employee, teams, order] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    orderId ? prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } }) : null,
  ]);

  const initialCustomer: CustomerFormData | undefined = order
    ? {
        type: order.customer.type,
        name: order.customer.name,
        companyName: order.customer.companyName ?? "",
        trn: order.customer.trn ?? "",
        phone: order.customer.phone,
        emirate: order.customer.emirate,
        buildingName: order.customer.buildingName ?? "",
        flatNo: order.customer.flatNo ?? "",
        leadSource: "Organic",
      }
    : undefined;

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <InvoiceWizard
        basePath="/admin"
        createdByName={employee.name}
        createdByCode={employee.code}
        teamOptions={teams}
        initialCustomer={initialCustomer}
        initialStep={order ? 1 : 0}
        orderId={order?.id}
      />
    </div>
  );
}
