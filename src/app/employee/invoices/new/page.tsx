import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { InvoiceWizard } from "@/components/invoice/InvoiceWizard";
import { CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import { getInventoryItemDisplayName, getBulkLocationQuantities } from "@/lib/inventoryData";
import type { CustomerFormData, ServiceFormData } from "@/components/invoice/types";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; quotationId?: string }>;
}) {
  const { orderId, quotationId } = await searchParams;
  const [employee, order, quotation, activeItems, labourItems] = await Promise.all([
    requireEmployee("EMPLOYEE"),
    orderId ? prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } }) : null,
    quotationId ? prisma.quotation.findUnique({ where: { id: quotationId }, include: { customer: true, items: true } }) : null,
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.labourItem.findMany({ where: { status: "Active" }, orderBy: { code: "asc" } }),
  ]);

  // Bulk-queried (not per-item) since the Spare Parts catalog can hold
  // hundreds of items -- see getBulkLocationQuantities.
  const stockByItem = await getBulkLocationQuantities(prisma, activeItems.map((i) => i.id), employee.id);
  const inventoryOptions = activeItems.map((item) => ({
    id: item.id,
    displayName: getInventoryItemDisplayName(item),
    unit: item.unit,
    currentStock: stockByItem[item.id] ?? 0,
  }));
  const sparePartOptions = activeItems
    .filter((item) => item.sku)
    .map((item) => ({
      id: item.id,
      sku: item.sku!,
      nameAr: item.nameAr,
      name: item.name,
      specification: item.specification,
      category: item.category,
      subcategory: item.subcategory,
      unit: item.unit,
      sellingPrice: item.sellingPrice,
      currentStock: stockByItem[item.id] ?? 0,
    }));
  const labourOptions = labourItems.map((l) => ({ id: l.id, code: l.code, nameAr: l.nameAr, nameEn: l.nameEn, defaultPrice: l.defaultPrice }));

  const sourceCustomer = order?.customer ?? quotation?.customer;
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
    : quotation
      ? {
          type: quotation.customerType,
          name: quotation.customerName,
          companyName: quotation.companyName ?? "",
          trn: quotation.trn ?? "",
          phone: quotation.phone ?? "",
          emirate: quotation.emirate ?? "Dubai",
          buildingName: quotation.buildingName ?? "",
          flatNo: quotation.flatNo ?? "",
          leadSource: "Organic",
        }
      : undefined;

  const initialService: ServiceFormData | undefined = quotation
    ? {
        serviceType: "Repair",
        category: "AC",
        items: quotation.items.map((item) => ({
          itemType: "Service" as const,
          service: CUSTOM_SERVICE_VALUE,
          customName: item.serviceName,
          description: item.description ?? "",
          qty: String(item.qty),
          unitPrice: String(item.unitPrice),
          originalPrice: "",
          inventoryItemId: "",
          labourItemId: "",
        })),
        inventoryEmployeeId: employee.id,
        inventoryUsage: [],
      }
    : undefined;

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "الفواتير", en: "Invoices" }} />
      <InvoiceWizard
        basePath="/employee"
        createdByName={employee.name}
        createdByCode={employee.code}
        initialCustomer={initialCustomer}
        initialService={initialService}
        initialStep={order || quotation ? 1 : 0}
        orderId={order?.id}
        quotationId={quotation?.id}
        currentEmployeeId={employee.id}
        inventoryOptions={inventoryOptions}
        sparePartOptions={sparePartOptions}
        labourOptions={labourOptions}
        sparePartPriceModification={employee.sparePartPriceModification}
        sparePartMaxDiscountPercent={employee.sparePartMaxDiscountPercent}
        labourPriceModification={employee.labourPriceModification}
        labourMaxDiscountPercent={employee.labourMaxDiscountPercent}
      />
    </div>
  );
}
