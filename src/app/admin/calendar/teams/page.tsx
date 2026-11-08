import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CalendarTabs } from "@/components/calendar/CalendarTabs";
import { TeamScheduleEditor, type TeamRow } from "@/components/calendar/TeamScheduleEditor";
import { DEFAULT_TEAM_RULES } from "@/lib/calendar/config";
import { toSchedule } from "@/lib/calendar/service";

export const dynamic = "force-dynamic";

export default async function TeamSchedulesPage() {
  await requireEmployee("ADMIN");
  let data: { teams: TeamRow[]; regions: { id: string; nameEn: string }[]; services: { id: string; nameEn: string }[] } | null = null;
  try {
    const [teams, regions, services] = await Promise.all([
      prisma.team.findMany({ orderBy: { name: "asc" }, include: { schedule: true } }),
      prisma.region.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
      prisma.bookableService.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }),
    ]);
    data = {
      regions, services,
      teams: teams.map((t) => {
        const s = t.schedule ? toSchedule(t.schedule as never) : null;
        return { id: t.id, name: t.name, active: s?.active ?? false, regionIds: s?.regionIds ?? [], serviceIds: s?.serviceIds ?? [], rules: s?.rules ?? DEFAULT_TEAM_RULES };
      }),
    };
  } catch {
    data = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Calendar & Scheduling · Team schedules" />
      <CalendarTabs active="teams" />
      <div className="px-4 py-5 sm:px-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Team schedules</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Each team has its own working days, hours, breaks and travel time. Switch a team on to put it on the calendar and protect it from double booking. A team that is switched off keeps working exactly as before. Leave the emirates or services empty to cover all of them.</p>
        {data ? <TeamScheduleEditor {...data} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The calendar needs a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
