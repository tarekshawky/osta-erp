import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WalletsManager } from "@/components/wallet/WalletsManager";
import { getCollectMoneyTotal, getEmployeeFinancials } from "@/lib/walletData";
import { getCreditCardWalletSummary } from "@/lib/creditCardData";

export default async function AdminWalletsPage() {
  const [employees, creditCardRecords] = await Promise.all([
    prisma.employee.findMany({ where: { hasWallet: true }, orderBy: { createdAt: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const [financialsList, collectMoneyTotal, creditCardSummaries] = await Promise.all([
    Promise.all(employees.map((emp) => getEmployeeFinancials(emp.id, emp.walletResetAt))),
    getCollectMoneyTotal(),
    Promise.all(creditCardRecords.map((c) => getCreditCardWalletSummary(c.id, c.creditLimit))),
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

  const creditCards = creditCardRecords.map((c, i) => ({
    id: c.id,
    name: c.name,
    cardHolder: c.cardHolder,
    lastFour: c.lastFour,
    creditLimit: c.creditLimit,
    status: c.status,
    billingCycle: c.billingCycle,
    paymentDueDate: c.paymentDueDate,
    notes: c.notes,
    ...creditCardSummaries[i],
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Wallets" />
      <div className="px-6 py-6">
        <WalletsManager wallets={wallets} collectMoneyTotal={collectMoneyTotal} creditCards={creditCards} />
      </div>
    </div>
  );
}
