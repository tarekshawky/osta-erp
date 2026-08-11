import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import type { CustomerFormData } from "@/components/invoice/types";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const [employee, order] = await Promise.all([
    requireEmployee("EMPLOYEE"),
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
    <div className="pb-8">
      <TopBar title="Invoices" />
      <InvoiceWizard
        basePath="/employee"
        createdByName={employee.name}
        createdByCode={employee.code}
        initialCustomer={initialCustomer}
        initialStep={order ? 1 : 0}
        orderId={order?.id}
      />
    </div>
  );
}
