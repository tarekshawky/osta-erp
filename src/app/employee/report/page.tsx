import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { CONDITION_STYLES } from "@/lib/workReportData";
import { WorkReportForm } from "./WorkReportForm";

export default async function ReportPage() {
  const employee = await requireEmployee("EMPLOYEE");
  const reports = await prisma.workReport.findMany({
    where: { createdById: employee.id },
    orderBy: { date: "desc" },
    include: { items: { include: { photos: true } } },
  });

  return (
    <div className="pb-8">
      <TopBar title="Work Report" />
      <WorkReportForm />
      <div className="px-5 mt-2">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Your Reports</h2>
        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const customerLine = [r.customerName, r.customerPhone, r.emirate, r.buildingName, r.flatNo]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-900 text-sm">{customerLine || "No customer info"}</div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">{formatDate(r.date)}</div>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {r.items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {item.deviceType}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            CONDITION_STYLES[item.condition] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.condition}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {[item.tonnage, item.gasType].filter(Boolean).join(" · ")}
                      </div>
                      {item.description && <p className="text-sm text-slate-600 mt-1">{item.description}</p>}
                      {item.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {item.photos.map((photo) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={photo.id}
                              src={photo.dataUrl}
                              alt=""
                              className="h-14 w-14 object-cover rounded-lg border border-slate-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {reports.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No reports submitted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
