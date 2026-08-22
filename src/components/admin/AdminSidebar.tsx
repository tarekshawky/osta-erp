"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";
import { LogoImage } from "@/components/LogoImage";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  children?: { href: string; label: string }[];
};

const NAV: NavItem[] = [
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
    href: "/admin/customers",
    label: "Customers",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
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
    href: "/admin/quotations",
    label: "Quotations",
    icon: (
      <>
        <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 12h6M9 16h6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
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
    href: "/admin/work-reports",
    label: "Work Reports",
    icon: (
      <>
        <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/warranty-certificates",
    label: "Warranty Certificates",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
    href: "/admin/financial-reports",
    label: "Financial Reports",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" strokeLinejoin="round" />
        <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: (
      <>
        <path d="M3 11l18-7-7 18-2-8-9-3z" strokeLinejoin="round" />
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
  {
    href: "/admin/vehicles",
    label: "Vehicles",
    icon: (
      <>
        <path d="M4 16v-4l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 16h18v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" strokeLinejoin="round" />
        <circle cx="7.5" cy="16" r="1.5" />
        <circle cx="16.5" cy="16" r="1.5" />
      </>
    ),
  },
  {
    href: "/admin/vehicles/expense-report",
    label: "Vehicle Expense Report",
    icon: (
      <>
        <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/rental-expenses",
    label: "Rental Expenses",
    icon: (
      <>
        <path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: (
      <>
        <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 8v8l9 5 9-5V8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    children: [
      { href: "/admin/inventory", label: "Dashboard" },
      { href: "/admin/inventory/categories", label: "Categories" },
      { href: "/admin/inventory/items", label: "Items" },
      { href: "/admin/inventory/main-warehouse", label: "Main Warehouse" },
      { href: "/admin/inventory/warehouse", label: "Branch Warehouses" },
      { href: "/admin/inventory/employees", label: "Employee Stock" },
      { href: "/admin/inventory/requests", label: "Stock Requests" },
      { href: "/admin/inventory/employee-transfer", label: "Transfers" },
      { href: "/admin/inventory/returns", label: "Returns" },
      { href: "/admin/inventory/damaged", label: "Damaged Items" },
      { href: "/admin/inventory/transactions?type=Stock+Adjustment", label: "Stock Adjustments" },
      { href: "/admin/inventory/main-warehouse?status=low", label: "Low Stock" },
      { href: "/admin/inventory/suppliers", label: "Suppliers" },
      { href: "/admin/inventory/reports", label: "Stock Reports" },
      { href: "/admin/inventory/transactions", label: "Movement History" },
    ],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-30 w-64 shrink-0 bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="px-6 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="bg-white rounded-lg px-2.5 py-1.5 inline-block">
            <LogoImage className="h-6 w-auto" />
          </div>
          <div className="text-xs text-blue-200 mt-1.5">Services ERP</div>
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

          if (!item.children) {
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
          }

          const autoExpanded = pathname.startsWith(item.href);
          const expanded = manualExpanded[item.href] ?? autoExpanded;

          return (
            <div key={item.href}>
              <div className={`flex items-center rounded-xl transition-colors ${active ? "bg-white text-blue-700" : "text-blue-100"}`}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl ${
                    active ? "" : "hover:bg-white/10"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
                <button
                  type="button"
                  onClick={() => setManualExpanded((m) => ({ ...m, [item.href]: !expanded }))}
                  aria-label={expanded ? "Collapse" : "Expand"}
                  className={`px-2.5 py-2.5 rounded-xl ${active ? "" : "hover:bg-white/10"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                  >
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {expanded && (
                <div className="ml-8 mt-1 mb-1 flex flex-col gap-0.5">
                  {item.children.map((child) => {
                    const childPath = child.href.split("?")[0];
                    const isDashboardChild = child.href === item.href;
                    const childActive = isDashboardChild
                      ? pathname === childPath
                      : pathname === childPath || pathname.startsWith(`${childPath}/`);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          childActive ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
