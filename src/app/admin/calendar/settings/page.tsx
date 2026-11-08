import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CalendarTabs } from "@/components/calendar/CalendarTabs";
import { SettingsEditor } from "@/components/calendar/SettingsEditor";
import { loadSettings } from "@/lib/calendar/service";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CalendarSettingsPage() {
  const admin = await requireEmployee("ADMIN");
  const role = admin.adminRoleId ? await prisma.adminRole.findUnique({ where: { id: admin.adminRoleId }, select: { permissions: true } }) : null;
  const canSync = hasPermission(admin, admin.adminRoleId ? (role?.permissions ?? []) : null, "calendar.override");
  let data: { config: Awaited<ReturnType<typeof loadSettings>>; services: { id: string; nameEn: string }[]; pending: number } | null = null;
  try {
    const [config, services, pending] = await Promise.all([
      loadSettings(),
      prisma.bookableService.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }),
      prisma.order.count({ where: { team: { schedule: { is: { active: true } } }, scheduledAt: { not: null }, status: { not: "Cancelled" }, calendarEntry: null } }),
    ]);
    data = { config, services, pending };
  } catch {
    data = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Calendar & Scheduling · Settings" />
      <CalendarTabs active="settings" />
      <div className="px-4 py-5 sm:px-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Calendar settings</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Rules that apply to every team. Changes take effect for new bookings straight away; bookings already on the calendar keep their time.</p>
        {data ? <SettingsEditor {...data} canSync={canSync} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The calendar needs a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
