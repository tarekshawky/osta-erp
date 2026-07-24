"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/admin/invoices",
    label: "Invoices",
    icon: (
      <>
        <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/expenses",
    label: "Expenses",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 15h2" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/employees",
    label: "Employees",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
        <circle cx="17" cy="8" r="2.4" />
        <path d="M15.5 14.2c2.5.4 4.5 2.7 4.5 5.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/payroll",
    label: "Payroll",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5.9 2.5 2c0 1.4-1.1 2-2.5 2.5-1.4.5-2.5 1.1-2.5 2.5s1.1 2 2.5 2 2.5-1.1 2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: (
      <>
        <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/wallets",
    label: "Wallets",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M16 12.5h2.5" strokeLinecap="round" />
      </>
    ),
  },
];

export function AdminSidebar({
  adminName,
  open,
  onClose,
}: {
  adminName: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-30 w-64 shrink-0 bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-xl font-black">OSTA</div>
          <div className="text-xs text-blue-200">Services ERP</div>
        </div>
        <button onClick={onClose} className="md:hidden text-blue-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-white text-blue-700" : "text-blue-100 hover:bg-white/10"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
          {initials(adminName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{adminName}</div>
          <div className="text-xs text-blue-300">Admin</div>
        </div>
      </div>
      <form action={logout} className="px-4 pb-4">
        <button className="flex items-center gap-2 text-sm text-blue-200 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </form>
    </aside>
  );
}
