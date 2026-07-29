import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WorkReportForm } from "@/app/employee/report/WorkReportForm";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminWorkReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEmployee("ADMIN");

  const report = await prisma.workReport.findUnique({
    where: { id },
    include: { items: { include: { photos: true } } },
  });
  if (!report) notFound();

  return (
    <div className="pb-10">
      <AdminTopBar title="Work Reports" />
      <div className="max-w-2xl">
        <WorkReportForm
          mode="edit"
          reportId={report.id}
          redirectTo="/admin/work-reports"
          initial={{
            date: toDateInput(report.date),
            customerName: report.customerName ?? "",
            customerPhone: report.customerPhone ?? "",
            emirate: report.emirate ?? "",
            buildingName: report.buildingName ?? "",
            flatNo: report.flatNo ?? "",
            items: report.items.map((item) => ({
              deviceType: item.deviceType,
              tonnage: item.tonnage ?? "",
              gasType: item.gasType ?? "",
              brand: item.brand ?? "",
              condition: item.condition,
              description: item.description ?? "",
              photos: item.photos.map((p) => p.dataUrl),
            })),
          }}
        />
      </div>
    </div>
  );
}
