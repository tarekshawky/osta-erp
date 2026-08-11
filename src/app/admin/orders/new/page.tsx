import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { OrderForm } from "@/components/order/OrderForm";
import type { OrderCustomerInput } from "@/app/admin/orders/actions";

export default async function AdminNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { customerId } = await searchParams;

  const [teams, employees, customer] = await Promise.all([
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: "active", role: "EMPLOYEE" },
      select: { id: true, name: true, code: true, teamId: true },
      orderBy: { name: "asc" },
    }),
    customerId ? prisma.customer.findUnique({ where: { id: customerId } }) : null,
  ]);

  const initialCustomer: OrderCustomerInput | undefined = customer
    ? {
        type: customer.type,
        name: customer.name,
        companyName: customer.companyName ?? "",
        trn: customer.trn ?? "",
        phone: customer.phone,
        whatsapp: customer.whatsapp ?? "",
        emirate: customer.emirate,
        buildingName: customer.buildingName ?? "",
        flatNo: customer.flatNo ?? "",
      }
    : undefined;

  return (
    <div className="pb-10">
      <AdminTopBar title="New Order" />
      <div className="px-5 py-4 max-w-xl">
        <OrderForm teamOptions={teams} employeeOptions={employees} initialCustomer={initialCustomer} />
      </div>
    </div>
  );
}
