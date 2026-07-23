import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ExpensesManager } from "@/components/expense/ExpensesManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [totalAgg, byCategory] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 2,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalAgg._count / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { createdBy: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows = expenses.map((exp) => ({
    id: exp.id,
    date: exp.date.toISOString(),
    description: exp.description,
    category: exp.category,
    payment: exp.payment,
    amount: exp.amount,
    status: exp.status,
    refundedAmount: exp.refundedAmount,
    createdByName: exp.createdBy.name,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Expenses" />

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <AdminStatCard label="Total Expenses" value={formatAed(totalAgg._sum.amount ?? 0)} valueClassName="text-red-500" />
          {byCategory.map((c) => (
            <AdminStatCard key={c.category ?? "none"} label={c.category ?? "Uncategorized"} value={formatAed(c._sum.amount ?? 0)} />
          ))}
        </div>

        <ExpensesManager expenses={rows} totalCount={totalAgg._count} page={safePage} totalPages={totalPages} />
      </div>
    </div>
  );
}
