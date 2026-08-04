import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WalletsManager } from "@/components/wallet/WalletsManager";
import { computeCollectMoneyTotal, getEmployeeFinancials } from "@/lib/walletData";

export default async function AdminWalletsPage() {
  const employees = await prisma.employee.findMany({ where: { hasWallet: true }, orderBy: { createdAt: "asc" } });

  const [financialsList, collectMoneyTotal] = await Promise.all([
    Promise.all(employees.map((emp) => getEmployeeFinancials(emp.id, emp.walletResetAt))),
    computeCollectMoneyTotal(),
  ]);

  const wallets = employees.map((emp, i) => {
    const financials = financialsList[i];
    return {
      id: emp.id,
      code: emp.code,
      name: emp.name,
      role: emp.role,
      photoData: emp.photoData,
      custody: emp.custody,
      revenue: financials.revenue,
      expenses: financials.expenses,
      revenueWithdrawn: emp.revenueWithdrawn,
      payments: { cash: financials.cash, ziina: financials.ziina, bankTransfer: financials.bankTransfer },
    };
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Wallets" />
      <div className="px-6 py-6">
        <WalletsManager wallets={wallets} collectMoneyTotal={collectMoneyTotal} />
      </div>
    </div>
  );
}
