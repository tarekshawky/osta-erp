import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import { SERVICE_CATALOG, CUSTOM_SERVICE_VALUE, type Category } from "@/lib/invoiceData";
import { getInventoryItemDisplayName, getBulkLocationQuantities } from "@/lib/inventoryData";
import type { CustomerFormData, ServiceFormData, PaymentFormData } from "@/components/invoice/types";

export default async function AdminInvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, invoice, teams, activeEmployees, activeItems, existingUsage] = await Promise.all([
    requireEmployee("ADMIN"),
    prisma.invoice.findUnique({ where: { id }, include: { customer: true, items: true } }),
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { status: "active" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.invoiceInventoryUsage.findMany({ where: { invoiceId: id } }),
  ]);
  if (!invoice) notFound();

  const inventoryEmployeeId = existingUsage[0]?.employeeId ?? admin.id;
  // Bulk-queried (not per-item) since the Spare Parts catalog can hold
  // hundreds of items -- see getBulkLocationQuantities.
  const stockByItem = await getBulkLocationQuantities(prisma, activeItems.map((i) => i.id), inventoryEmployeeId);
  const inventoryOptions = activeItems.map((item) => ({
    id: item.id,
    displayName: getInventoryItemDisplayName(item),
    unit: item.unit,
    currentStock: stockByItem[item.id] ?? 0,
  }));

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
    inventoryEmployeeId,
    inventoryUsage: existingUsage.map((u) => ({ inventoryItemId: u.inventoryItemId, quantity: String(u.quantity) })),
  };

  const initialPayment: PaymentFormData = {
    method: invoice.payment as "Cash" | "Bank Transfer" | "Ziina",
    date: invoice.date.toISOString().slice(0, 10),
    teamId: invoice.teamId ?? "",
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
        teamOptions={teams}
        currentEmployeeId={inventoryEmployeeId}
        employeeOptions={activeEmployees}
        inventoryOptions={inventoryOptions}
      />
    </div>
  );
}
