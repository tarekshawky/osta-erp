import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { OrderDetail } from "@/components/order/OrderDetail";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, team: true, assignedTo: true, createdBy: true, invoice: true },
  });
  if (!order) notFound();

  return (
    <div className="pb-10">
      <AdminTopBar title="Order Details" />
      <div className="px-5 py-4 max-w-xl">
        <OrderDetail order={order} basePath="/admin" canAdvance />
      </div>
    </div>
  );
}
