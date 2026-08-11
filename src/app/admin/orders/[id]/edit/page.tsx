import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { OrderForm } from "@/components/order/OrderForm";
import type { OrderCustomerInput, OrderDetailsInput } from "@/app/admin/orders/actions";

export default async function AdminOrderEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const [teams, employees, order] = await Promise.all([
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: "active", role: "EMPLOYEE" },
      select: { id: true, name: true, code: true, teamId: true },
      orderBy: { name: "asc" },
    }),
    prisma.order.findUnique({ where: { id }, include: { customer: true } }),
  ]);
  if (!order) notFound();

  const initialCustomer: OrderCustomerInput = {
    type: order.customer.type,
    name: order.customer.name,
    companyName: order.customer.companyName ?? "",
    trn: order.customer.trn ?? "",
    phone: order.customer.phone,
    emirate: order.customer.emirate,
    buildingName: order.customer.buildingName ?? "",
    flatNo: order.customer.flatNo ?? "",
  };

  const initialDetails: OrderDetailsInput = {
    teamId: order.teamId ?? "",
    assignedToId: order.assignedToId,
    notes: order.notes ?? "",
    scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString().slice(0, 16) : "",
    locationUrl: order.locationUrl ?? "",
    orderType: order.orderType,
    priceAgreed: order.priceAgreed,
    customerLanguage: order.customerLanguage,
  };

  return (
    <div className="pb-10">
      <AdminTopBar title="Edit Order" />
      <div className="px-5 py-4 max-w-xl">
        <OrderForm
          teamOptions={teams}
          employeeOptions={employees}
          mode="edit"
          editOrderId={order.id}
          initialCustomer={initialCustomer}
          initialDetails={initialDetails}
        />
      </div>
    </div>
  );
}
