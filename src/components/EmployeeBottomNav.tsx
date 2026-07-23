"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/employee",
    label: "Home",
    icon: (
      <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z" strokeLinejoin="round" />
    ),
  },
  {
    href: "/employee/invoices",
    label: "Invoices",
    icon: (
      <>
        <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/employee/expenses",
    label: "Expenses",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 15h2" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/employee/profile",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" />
      </>
    ),
  },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-slate-100 bg-white/95 backdrop-blur">
      {items.map((item) => {
        const active =
          item.href === "/employee" ? pathname === "/employee" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
              active ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
