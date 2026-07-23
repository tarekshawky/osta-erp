import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WalletsManager } from "@/components/wallet/WalletsManager";

export default async function AdminWalletsPage() {
  const [employees, revenueByEmployee, expensesByEmployee] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invoice.groupBy({ by: ["createdById"], _sum: { amount: true }, where: { status: "Paid" } }),
    prisma.expense.groupBy({ by: ["createdById"], _sum: { amount: true } }),
  ]);

  const revenueMap = new Map(revenueByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));
  const expenseMap = new Map(expensesByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));

  const wallets = employees.map((emp) => ({
    id: emp.id,
    code: emp.code,
    name: emp.name,
    role: emp.role,
    custody: emp.custody,
    revenue: revenueMap.get(emp.id) ?? 0,
    expenses: expenseMap.get(emp.id) ?? 0,
    revenueWithdrawn: emp.revenueWithdrawn,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Wallets" />
      <div className="px-6 py-6">
        <WalletsManager wallets={wallets} />
      </div>
    </div>
  );
}
