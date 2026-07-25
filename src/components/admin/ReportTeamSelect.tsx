"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ReportTeamSelect({ teams, selectedTeam }: { teams: string[]; selectedTeam: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateTeam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("team");
    } else {
      params.set("team", value);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/reports?${qs}` : "/admin/reports");
  }

  return (
    <select
      value={selectedTeam}
      onChange={(e) => updateTeam(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
    >
      <option value="all">All Teams</option>
      {teams.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
