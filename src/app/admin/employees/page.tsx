import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmployeesManager } from "@/components/employee-admin/EmployeesManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const totalCount = await prisma.employee.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const [employees, revenueByEmployee] = await Promise.all([
    prisma.employee.findMany({
      include: { team: true },
      orderBy: { createdAt: "asc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.groupBy({ by: ["createdById"], _sum: { amount: true }, where: { status: "Paid" } }),
  ]);

  const revenueMap = new Map(revenueByEmployee.map((r) => [r.createdById, r._sum.amount ?? 0]));

  const rows = employees.map((emp) => ({
    id: emp.id,
    code: emp.code,
    name: emp.name,
    jobTitle: emp.jobTitle,
    phone: emp.phone,
    teamName: emp.team?.name ?? null,
    role: emp.role,
    status: emp.status,
    custody: emp.custody,
    revenue: revenueMap.get(emp.id) ?? 0,
    monthlySalary: emp.monthlySalary,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Employees" />

      <div className="px-6 py-6">
        <EmployeesManager employees={rows} totalCount={totalCount} page={safePage} totalPages={totalPages} />
      </div>
    </div>
  );
}
