import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { QuotationWizard } from "@/components/quotation/QuotationWizard";
import { CATEGORIES, SERVICE_CATALOG, CUSTOM_SERVICE_VALUE, type Category } from "@/lib/invoiceData";
import type { CustomerFormData, ServiceFormData } from "@/components/invoice/types";

function detectCategory(serviceNames: string[]): Category {
  for (const category of CATEGORIES) {
    if (serviceNames.some((name) => SERVICE_CATALOG[category].includes(name))) {
      return category;
    }
  }
  return "AC";
}

export default async function AdminQuotationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, quotation] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.quotation.findUnique({ where: { id }, include: { items: true } }),
  ]);
  if (!quotation) notFound();

  const category = detectCategory(quotation.items.map((i) => i.serviceName));
  const catalog = SERVICE_CATALOG[category];

  const initialCustomer: CustomerFormData = {
    type: quotation.customerType,
    name: quotation.customerName,
    companyName: quotation.companyName ?? "",
    trn: quotation.trn ?? "",
    phone: quotation.phone ?? "",
    emirate: quotation.emirate ?? "Dubai",
    buildingName: quotation.buildingName ?? "",
    flatNo: quotation.flatNo ?? "",
    leadSource: "Organic",
  };

  const initialService: ServiceFormData = {
    serviceType: "Repair",
    category,
    items: quotation.items.length
      ? quotation.items.map((item) => {
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

  return (
    <div className="pb-10">
      <AdminTopBar title="Quotations" />
      <QuotationWizard
        basePath="/admin"
        createdByName={admin.name}
        mode="edit"
        editQuotationId={quotation.id}
        initialCustomer={initialCustomer}
        initialService={initialService}
      />
    </div>
  );
}
