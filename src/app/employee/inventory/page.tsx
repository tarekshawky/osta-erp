import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { MyInventoryList } from "@/components/inventory/MyInventoryList";
import { getEmployeeInventory } from "@/lib/inventoryData";

export default async function MyInventoryPage() {
  const employee = await requireEmployee("EMPLOYEE");
  const rows = await getEmployeeInventory(employee.id);

  return (
    <div className="pb-8">
      <TopBar title="My Inventory" />
      <div className="px-5 py-4">
        <p className="text-sm text-slate-500 mb-4">What you currently have. Only Admin can change these quantities.</p>
        <MyInventoryList rows={rows} />
      </div>
    </div>
  );
}
