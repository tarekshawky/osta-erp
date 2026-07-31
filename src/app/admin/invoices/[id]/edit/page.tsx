import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import { SERVICE_CATALOG, CUSTOM_SERVICE_VALUE, type Category } from "@/lib/invoiceData";
import type { CustomerFormData, ServiceFormData, PaymentFormData } from "@/components/invoice/types";

export default async function AdminInvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, invoice] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.invoice.findUnique({ where: { id }, include: { customer: true, items: true } }),
  ]);
  if (!invoice) notFound();

  const category = invoice.category as Category;
  const catalog = SERVICE_CATALOG[category] ?? SERVICE_CATALOG.AC;

  const initialCustomer: CustomerFormData = {
    type: invoice.customer.type,
    name: invoice.customer.name,
    companyName: invoice.customer.companyName ?? "",
    trn: invoice.customer.trn ?? "",
    phone: invoice.customer.phone,
    emirate: invoice.customer.emirate,
    buildingName: invoice.customer.buildingName ?? "",
    flatNo: invoice.customer.flatNo ?? "",
    leadSource: invoice.leadSource as CustomerFormData["leadSource"],
  };

  const initialService: ServiceFormData = {
    serviceType: invoice.serviceType as "Repair" | "Inspection",
    category,
    items: invoice.items.length
      ? invoice.items.map((item) => {
          const isKnown = catalog.includes(item.serviceName);
          return {
            service: isKnown ? item.serviceName : CUSTOM_SERVICE_VALUE,
            customName: isKnown ? "" : item.serviceName,
            description: item.description ?? "",
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
          };
        })
      : [{ service: "", customName: "", description: "", qty: "1", unitPrice: "" }],
  };

  const initialPayment: PaymentFormData = {
    method: invoice.payment as "Cash" | "Bank Transfer" | "Ziina",
  };

  return (
    <div className="pb-10">
      <AdminTopBar title="Invoices" />
      <InvoiceWizard
        basePath="/admin"
        createdByName={admin.name}
        createdByCode={admin.code}
        mode="edit"
        editInvoiceId={invoice.id}
        initialCustomer={initialCustomer}
        initialService={initialService}
        initialPayment={initialPayment}
      />
    </div>
  );
}
