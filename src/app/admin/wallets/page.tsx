import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WalletsManager } from "@/components/wallet/WalletsManager";

export default async function AdminWalletsPage() {
  const [employees, revenueByEmployee, expensesByEmployee, paymentByEmployee] = await Promise.all([
    prisma.employee.findMany({ where: { hasWallet: true }, orderBy: { createdAt: "asc" } }),
    prisma.invoice.groupBy({ by: ["createdById"], _sum: { amount: true }, where: { status: "Paid" } }),
    prisma.expense.groupBy({ by: ["createdById"], _sum: { amount: true } }),
    prisma.invoice.groupBy({
      by: ["createdById", "payment"],
      _sum: { amount: true },
      where: { status: "Paid" },
    }),
  ]);

  const revenueMap = new Map(revenueByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));
  const expenseMap = new Map(expensesByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));

  const paymentMap = new Map<string, { cash: number; ziina: number; bankTransfer: number }>();
  for (const row of paymentByEmployee) {
    const entry = paymentMap.get(row.createdById) ?? { cash: 0, ziina: 0, bankTransfer: 0 };
    const amount = row._sum.amount ?? 0;
    if (row.payment === "Cash") entry.cash += amount;
    else if (row.payment === "Ziina") entry.ziina += amount;
    else if (row.payment === "Bank Transfer") entry.bankTransfer += amount;
    paymentMap.set(row.createdById, entry);
  }

  const wallets = employees.map((emp) => ({
    id: emp.id,
    code: emp.code,
    name: emp.name,
    role: emp.role,
    photoData: emp.photoData,
    custody: emp.custody,
    revenue: revenueMap.get(emp.id) ?? 0,
    expenses: expenseMap.get(emp.id) ?? 0,
    revenueWithdrawn: emp.revenueWithdrawn,
    payments: paymentMap.get(emp.id) ?? { cash: 0, ziina: 0, bankTransfer: 0 },
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
