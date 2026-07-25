"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/format";
import { TeamBadge } from "./TeamBadge";
import { DeleteWorkReportButton } from "./DeleteWorkReportButton";
import { Pagination } from "./Pagination";
import { CONDITION_STYLES } from "@/lib/workReportData";

export type WorkReportItemRow = {
  id: string;
  deviceType: string;
  tonnage: string | null;
  gasType: string | null;
  brand: string | null;
  condition: string;
  description: string | null;
  photos: { id: string; dataUrl: string }[];
};

export type WorkReportRow = {
  id: string;
  date: string;
  customerName: string | null;
  customerPhone: string | null;
  emirate: string | null;
  buildingName: string | null;
  flatNo: string | null;
  teamName: string | null;
  createdByName: string;
  items: WorkReportItemRow[];
};

export function WorkReportsManager({
  reports,
  totalCount,
  page,
  totalPages,
  year,
  month,
  teams,
  selectedTeam,
}: {
  reports: WorkReportRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  year?: string;
  month?: string;
  teams: string[];
  selectedTeam: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateTeam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("team");
    } else {
      params.set("team", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/work-reports?${qs}` : "/admin/work-reports");
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} records</p>
        </div>
        <select
          value={selectedTeam}
          onChange={(e) => updateTeam(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All Teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {reports.map((r) => {
          const customerLine = [r.customerName, r.customerPhone, r.emirate, r.buildingName, r.flatNo]
            .filter(Boolean)
            .join(" · ");
          return (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{customerLine || "No customer info"}</span>
                  <TeamBadge name={r.teamName} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(new Date(r.date))} · {r.createdByName}
                  </span>
                  <DeleteWorkReportButton reportId={r.id} className="text-red-500 hover:text-red-600 p-1" />
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                      {[item.tonnage, item.gasType].filter(Boolean).join(" · ") || "—"}
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
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-400">
            No work reports match your filters.
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white">
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/work-reports"
          searchParams={{ year, month, team: selectedTeam !== "all" ? selectedTeam : undefined }}
        />
      </div>
    </div>
  );
}
