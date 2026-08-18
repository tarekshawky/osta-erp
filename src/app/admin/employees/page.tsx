import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmployeesManager } from "@/components/employee-admin/EmployeesManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { getEmployeeFinancials } from "@/lib/walletData";

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

  const employees = await prisma.employee.findMany({
    include: { team: true },
    orderBy: { createdAt: "asc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const financialsList = await Promise.all(
    employees.map((emp) => getEmployeeFinancials(emp.id, emp.walletResetAt))
  );

  const rows = employees.map((emp, i) => ({
    id: emp.id,
    code: emp.code,
    name: emp.name,
    jobTitle: emp.jobTitle,
    phone: emp.phone,
    teamName: emp.team?.name ?? null,
    role: emp.role,
    status: emp.status,
    custody: emp.custody,
    revenue: financialsList[i].revenue,
    monthlySalary: emp.monthlySalary,
    hasWallet: emp.hasWallet,
    joinDate: emp.joinDate ? emp.joinDate.toISOString().slice(0, 10) : null,
    endOfServiceDate: emp.endOfServiceDate ? emp.endOfServiceDate.toISOString().slice(0, 10) : null,
    sparePartPriceModification: emp.sparePartPriceModification,
    sparePartMaxDiscountPercent: emp.sparePartMaxDiscountPercent,
    labourPriceModification: emp.labourPriceModification,
    labourMaxDiscountPercent: emp.labourMaxDiscountPercent,
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
