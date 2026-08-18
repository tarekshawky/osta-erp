import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SuppliersManager } from "@/components/inventory/SuppliersManager";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Suppliers" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500 mt-0.5">Vendors that inventory items can be linked to.</p>
        </div>
        <SuppliersManager suppliers={suppliers} />
      </div>
    </div>
  );
}
