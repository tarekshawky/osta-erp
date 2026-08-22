// Standalone, idempotent seed for the Warehouse Hierarchy & Inventory
// Governance plan. Never imported by prisma/seed.ts (which destructively
// deleteMany()s across the whole DB) -- safe to re-run against the shared
// live DB at any time.
//
// 1. Upserts the one Main Warehouse (type="Main"). Existing 5 warehouses
//    already backfilled to type="Branch" by the schema migration's column
//    default -- nothing to do for them here.
// 2. Upserts every INVENTORY_CATEGORIES entry as a real InventoryCategory row
//    (name-keyed), so Admin can Add/Edit/Deactivate them going forward.
// 3. Upserts every distinct (category, subcategory) pair already present on
//    InventoryItem as a real InventorySubcategory row, so nothing existing
//    goes un-registered.
import { prisma } from "../src/lib/prisma";
import { INVENTORY_CATEGORIES, MAIN_WAREHOUSE_NAME } from "../src/lib/inventoryData";

async function main() {
  const admin = await prisma.employee.findFirst({ where: { role: "ADMIN" }, orderBy: { code: "asc" } });
  if (!admin) throw new Error("No Admin employee found -- cannot attribute createdById.");

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { name: MAIN_WAREHOUSE_NAME },
    update: {},
    create: { name: MAIN_WAREHOUSE_NAME, type: "Main", status: "Active" },
  });
  console.log(`Main Warehouse: ${mainWarehouse.id} (${mainWarehouse.name})`);

  let categoriesCreated = 0;
  const categoryIdByName = new Map<string, string>();
  for (const name of INVENTORY_CATEGORIES) {
    const existing = await prisma.inventoryCategory.findUnique({ where: { name } });
    const row =
      existing ??
      (await prisma.inventoryCategory.create({ data: { name, createdById: admin.id } }));
    if (!existing) categoriesCreated++;
    categoryIdByName.set(name, row.id);
  }
  console.log(`Categories: ${categoriesCreated} created, ${INVENTORY_CATEGORIES.length - categoriesCreated} already existed.`);

  const existingPairs = await prisma.inventoryItem.groupBy({
    by: ["category", "subcategory"],
    where: { subcategory: { not: null } },
  });

  let subcategoriesCreated = 0;
  for (const pair of existingPairs) {
    const categoryId = categoryIdByName.get(pair.category);
    if (!categoryId) {
      console.warn(`Skipping subcategory "${pair.subcategory}" -- category "${pair.category}" not in INVENTORY_CATEGORIES.`);
      continue;
    }
    const existing = await prisma.inventorySubcategory.findUnique({
      where: { categoryId_name: { categoryId, name: pair.subcategory! } },
    });
    if (!existing) {
      await prisma.inventorySubcategory.create({ data: { categoryId, name: pair.subcategory! } });
      subcategoriesCreated++;
    }
  }
  console.log(`Subcategories: ${subcategoriesCreated} created, ${existingPairs.length - subcategoriesCreated} already existed.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
