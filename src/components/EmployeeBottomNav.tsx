"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const items = [
  {
    href: "/employee",
    matchPath: "/employee",
    exact: true,
    label: { ar: "الرئيسية", en: "Home" },
    icon: (
      <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z" strokeLinejoin="round" />
    ),
  },
  {
    href: "/employee/invoices",
    matchPath: "/employee/invoices",
    exact: false,
    label: { ar: "الفواتير", en: "Invoices" },
    icon: (
      <>
        <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/employee/inventory?tab=request",
    matchPath: "/employee/inventory",
    exact: false,
    label: { ar: "طلب مخزون", en: "Request" },
    icon: (
      <>
        <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" strokeLinejoin="round" />
        <path d="M4 8l8 4 8-4M12 12v8" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/employee/expenses",
    matchPath: "/employee/expenses",
    exact: false,
    label: { ar: "المصاريف", en: "Expenses" },
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 15h2" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/employee/profile",
    matchPath: "/employee/profile",
    exact: false,
    label: { ar: "حسابي", en: "Profile" },
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
      </>
    ),
  },
];

export function EmployeeBottomNav({ lang }: { lang: EmployeeLang }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-slate-100 bg-white/95 backdrop-blur">
      {items.map((item) => {
        const active = item.exact ? pathname === item.matchPath : pathname.startsWith(item.matchPath);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${
              active ? "text-blue-600" : "text-slate-400"
            } ${lang === "ar" ? tajawal.className : ""}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {item.icon}
            </svg>
            {item.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}
