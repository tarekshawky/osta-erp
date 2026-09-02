import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { SparePartsCatalogBrowser } from "@/components/inventory/SparePartsCatalogBrowser";
import { getBulkLocationQuantities, getBulkItemTotalQuantities } from "@/lib/inventoryData";
import { getEmployeeLang } from "@/lib/employeeLang";

export default async function SparePartsCatalogPage() {
  const employee = await requireEmployee("EMPLOYEE");
  const lang = await getEmployeeLang();

  const items = await prisma.inventoryItem.findMany({
    where: { status: "Active", sku: { not: null } },
    orderBy: { name: "asc" },
  });

  const itemIds = items.map((i) => i.id);
  const [myStockMap, totalStockMap] = await Promise.all([
    getBulkLocationQuantities(prisma, itemIds, employee.id),
    getBulkItemTotalQuantities(prisma, itemIds),
  ]);

  const catalogItems = items.map((item) => ({
    id: item.id,
    sku: item.sku!,
    name: item.name,
    nameAr: item.nameAr,
    specification: item.specification,
    category: item.category,
    unit: item.unit,
    sellingPrice: item.sellingPrice,
    myStock: myStockMap[item.id] ?? 0,
    totalStock: totalStockMap[item.id] ?? 0,
  }));

  const categories = [...new Set(catalogItems.map((i) => i.category))].sort();

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "قطع الغيار", en: "Spare Parts" }} />
      <SparePartsCatalogBrowser items={catalogItems} categories={categories} lang={lang} />
    </div>
  );
}
