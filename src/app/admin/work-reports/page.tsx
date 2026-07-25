import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WorkReportsManager } from "@/components/admin/WorkReportsManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { buildDateRange } from "@/lib/dateRangeFilter";
import type { Prisma } from "@/generated/prisma";

export default async function AdminWorkReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; year?: string; month?: string; team?: string }>;
}) {
  const { page: pageParam, year: yearParam, month: monthParam, team = "all" } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [reportDates, teams] = await Promise.all([
    prisma.workReport.findMany({ select: { date: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  const years = Array.from(new Set(reportDates.map((r) => r.date.getFullYear()))).sort((a, b) => b - a);

  const where: Prisma.WorkReportWhereInput = {};
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;
  if (team !== "all") where.team = { name: team };

  const totalCount = await prisma.workReport.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const reports = await prisma.workReport.findMany({
    where,
    orderBy: { date: "desc" },
    include: { createdBy: true, team: true, items: { include: { photos: true } } },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows = reports.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    emirate: r.emirate,
    buildingName: r.buildingName,
    flatNo: r.flatNo,
    teamName: r.team?.name ?? null,
    createdByName: r.createdBy.name,
    items: r.items.map((item) => ({
      id: item.id,
      deviceType: item.deviceType,
      tonnage: item.tonnage,
      gasType: item.gasType,
      brand: item.brand,
      condition: item.condition,
      description: item.description,
      photos: item.photos.map((p) => ({ id: p.id, dataUrl: p.dataUrl })),
    })),
  }));

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Work Reports"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/work-reports" }}
      />

      <div className="px-6 py-6">
        <WorkReportsManager
          reports={rows}
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          year={year ? String(year) : undefined}
          month={month ? String(month) : undefined}
          teams={teams.map((t) => t.name)}
          selectedTeam={team}
        />
      </div>
    </div>
  );
}
