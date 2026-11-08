import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CalendarBoard, type BoardTeam, type TeamDay } from "@/components/calendar/CalendarBoard";
import { CalendarTabs } from "@/components/calendar/CalendarTabs";
import { loadSettings, listItems, toSchedule } from "@/lib/calendar/service";
import { availableStarts } from "@/lib/calendar/engine";
import { DAY_MS, dayKey, isDayKey, startOfDay, startOfMonth, startOfWeek } from "@/lib/calendar/time";
import { closedReason, durationFor } from "@/lib/calendar/config";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SP = { view?: string; date?: string; team?: string; region?: string };

// The visible range of days for a view: one day, a Monday-first week, or the month grid (whole weeks).
function rangeFor(view: "day" | "week" | "month", date: string): { first: string; days: number } {
  if (view === "day") return { first: date, days: 1 };
  if (view === "week") return { first: startOfWeek(date), days: 7 };
  return { first: startOfWeek(startOfMonth(date)), days: 42 };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireEmployee("ADMIN");
  const sp = await searchParams;
  const today = dayKey(new Date());
  const view = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const date = sp.date && isDayKey(sp.date) ? sp.date : today;

  let setup: Awaited<ReturnType<typeof load>> | null = null;
  try {
    setup = await load(admin, view, date, sp.team ?? "", sp.region ?? "");
  } catch {
    setup = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Calendar & Scheduling" />
      <CalendarTabs active="calendar" />
      <div className="px-4 py-5 sm:px-6">
        {setup ? (
          <CalendarBoard {...setup} view={view} date={date} today={today} teamFilter={sp.team ?? ""} regionFilter={sp.region ?? ""} />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The calendar needs a database update that has not been applied yet. Run <code>npx prisma db push</code>, then <code>npx prisma db execute --file prisma/calendar-constraints.sql</code>.</p>
        )}
      </div>
    </div>
  );
}

async function load(admin: { id: string; role: string; adminRoleId: string | null }, view: "day" | "week" | "month", date: string, teamId: string, regionId: string) {
  const role = admin.adminRoleId ? await prisma.adminRole.findUnique({ where: { id: admin.adminRoleId }, select: { permissions: true } }) : null;
  const perms = admin.adminRoleId ? (role?.permissions ?? []) : null;
  const can = { manage: hasPermission(admin, perms, "calendar.manage"), override: hasPermission(admin, perms, "calendar.override") };

  const { first, days } = rangeFor(view, date);
  const from = startOfDay(first), to = new Date(from.getTime() + days * DAY_MS);
  const [cfg, schedules, regions, services, employees, items] = await Promise.all([
    loadSettings(),
    prisma.teamSchedule.findMany({ where: { active: true }, include: { team: { select: { id: true, name: true } } }, orderBy: { team: { name: "asc" } } }),
    prisma.region.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
    prisma.bookableService.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }),
    prisma.employee.findMany({ where: { status: "active", role: "EMPLOYEE" }, orderBy: { name: "asc" }, select: { id: true, name: true, teamId: true } }),
    listItems({ from, to, teamId: teamId || undefined, regionId: regionId || undefined }),
  ]);

  const teams: BoardTeam[] = schedules.map((s) => {
    const sc = toSchedule(s as never);
    return { id: s.team.id, name: s.team.name, regionIds: sc.regionIds, serviceIds: sc.serviceIds, startTime: sc.rules.startTime, endTime: sc.rules.endTime, breaks: sc.rules.breaks, workDays: sc.rules.workDays, maxPerDay: sc.rules.maxPerDay };
  });

  // For the day view: each team's bookings and whether it still has room for an average visit.
  const stats: TeamDay[] = [];
  if (view === "day") {
    const day = date;
    for (const s of schedules) {
      const sc = toSchedule(s as never);
      const mine = items.filter((i) => i.teamId === s.team.id && i.status !== "Cancelled");
      const busy = mine.map((i) => ({ startsAt: new Date(i.startsAt), endsAt: new Date(i.endsAt), busyUntil: new Date(i.busyUntil), kind: i.kind }));
      const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
      const closed = closedReason(cfg, day);
      const off = !!closed || !sc.rules.workDays.includes(dow);
      const free = off ? 0 : availableStarts({ day, rules: sc.rules, cfg, busy, durationMin: cfg.defaultDurationMin, now: new Date(), ignoreLimits: true }).length;
      stats.push({ teamId: s.team.id, bookings: mine.filter((i) => i.kind === "BOOKING").length, free, off, note: closed ?? "Day off" });
    }
  }
  return { items, teams, regions, services, employees, stats, can, firstDay: first, days, defaultDuration: cfg.defaultDurationMin, step: cfg.stepMinutes, durations: Object.fromEntries(services.map((x) => [x.id, { minutes: durationFor(cfg, x.id, 1), perUnit: cfg.services[x.id]?.perUnit ?? 0 }])) };
}
