import Link from "next/link";

const TABS = [
  { key: "calendar", href: "/admin/calendar", label: "Calendar" },
  { key: "teams", href: "/admin/calendar/teams", label: "Team schedules" },
  { key: "settings", href: "/admin/calendar/settings", label: "Settings" },
] as const;

export function CalendarTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="flex gap-1 border-b border-[#DCE5F7] bg-white px-4 sm:px-6" aria-label="Calendar sections">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${active === t.key ? "border-[#0B2A6B] text-[#0B2A6B]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
