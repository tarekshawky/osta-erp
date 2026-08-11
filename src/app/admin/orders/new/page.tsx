import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { OrderForm } from "@/components/order/OrderForm";

export default async function AdminNewOrderPage() {
  await requireEmployee("ADMIN");

  const [teams, employees] = await Promise.all([
    prisma.team.findMany({ where: { name: { in: ["Ajman", "Al Ain"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: "active", role: "EMPLOYEE" },
      select: { id: true, name: true, code: true, teamId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="New Order" />
      <div className="px-5 py-4 max-w-xl">
        <OrderForm teamOptions={teams} employeeOptions={employees} />
      </div>
    </div>
  );
}
