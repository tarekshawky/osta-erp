import Link from "next/link";

export function QuickActionTile({
  href,
  icon,
  iconBg,
  iconColor,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center text-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <span className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </Link>
  );
}
