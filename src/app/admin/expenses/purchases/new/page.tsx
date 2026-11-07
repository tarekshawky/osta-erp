import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CustomerPurchaseForm } from "@/components/expense/CustomerPurchaseForm";

export default async function NewCustomerPurchasePage() {
  const [teams, employees, cards] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.creditCard.findMany({ where: { status: "Active" }, orderBy: { name: "asc" }, select: { id: true, name: true, lastFour: true } }),
  ]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Customer Materials Purchase" hideMonth />
      <div className="px-4 py-6 sm:px-6">
        <CustomerPurchaseForm teams={teams} employees={employees} cards={cards} />
      </div>
    </div>
  );
}
