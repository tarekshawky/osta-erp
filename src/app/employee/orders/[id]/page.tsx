import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { OrderDetail } from "@/components/order/OrderDetail";

export default async function EmployeeOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, team: true, assignedTo: true, createdBy: true, invoice: true },
  });
  if (!order || order.assignedToId !== session!.employeeId) notFound();

  return (
    <div className="pb-8">
      <TopBar title="Order Details" />
      <div className="px-5 py-4">
        <OrderDetail order={order} basePath="/employee" canAdvance />
      </div>
    </div>
  );
}
