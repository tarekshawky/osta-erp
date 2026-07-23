export function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center text-center">
      <span
        className={`h-9 w-9 rounded-full flex items-center justify-center mb-2 ${iconBg} ${iconColor}`}
      >
        {icon}
      </span>
      <span className="font-bold text-slate-900 text-sm">{value}</span>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}
