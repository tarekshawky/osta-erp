import Link from "next/link";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

export function QuickActionTile({
  href,
  icon,
  iconBg,
  iconColor,
  label,
  lang,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  lang?: EmployeeLang;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center text-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <span className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      <span
        className={`text-xs font-medium text-slate-700 ${lang === "ar" ? tajawal.className : ""}`}
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {label}
      </span>
    </Link>
  );
}
