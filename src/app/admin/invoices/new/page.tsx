import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import type { CustomerFormData } from "@/components/invoice/types";

export default async function AdminNewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; customerId?: string }>;
}) {
  const { orderId, customerId } = await searchParams;
  const [employee, teams, order, customer] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    orderId ? prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } }) : null,
    !orderId && customerId ? prisma.customer.findUnique({ where: { id: customerId } }) : null,
  ]);

  const sourceCustomer = order?.customer ?? customer;
  const initialCustomer: CustomerFormData | undefined = sourceCustomer
    ? {
        type: sourceCustomer.type,
        name: sourceCustomer.name,
        companyName: sourceCustomer.companyName ?? "",
        trn: sourceCustomer.trn ?? "",
        phone: sourceCustomer.phone,
        emirate: sourceCustomer.emirate,
        buildingName: sourceCustomer.buildingName ?? "",
        flatNo: sourceCustomer.flatNo ?? "",
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
