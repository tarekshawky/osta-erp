import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuotationWizard } from "@/components/quotation/QuotationWizard";
import type { CustomerFormData } from "@/components/invoice/types";

export default async function AdminNewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const employee = await requireEmployee("ADMIN");
  const { customerId } = await searchParams;
  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;

  const initialCustomer: CustomerFormData | undefined = customer
    ? {
        type: customer.type,
        name: customer.name,
        companyName: customer.companyName ?? "",
        trn: customer.trn ?? "",
        phone: customer.phone,
        emirate: customer.emirate,
        buildingName: customer.buildingName ?? "",
        flatNo: customer.flatNo ?? "",
        leadSource: "Organic",
      }
    : undefined;

  return (
    <div className="pb-10">
      <AdminTopBar title="Quotations" />
      <QuotationWizard basePath="/admin" createdByName={employee.name} initialCustomer={initialCustomer} />
    </div>
  );
}
