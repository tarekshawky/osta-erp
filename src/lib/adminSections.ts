// Canonical list of top-level /admin dashboard sections, keyed by their
// sidebar href (src/components/admin/AdminSidebar.tsx's NAV). A plain ADMIN
// (not SUPER_ADMIN) can be restricted to a subset of these via
// Employee.adminSections -- see that field's comment in schema.prisma.
export const ADMIN_SECTIONS = [
  { key: "/admin", label: "Dashboard" },
  { key: "/admin/customers", label: "Customers" },
  { key: "/admin/invoices", label: "Invoices" },
  { key: "/admin/quotations", label: "Quotations" },
  { key: "/admin/orders", label: "Orders" },
  { key: "/admin/expenses", label: "Expenses" },
  { key: "/admin/employees", label: "Employees" },
  { key: "/admin/payroll", label: "Payroll" },
  { key: "/admin/work-reports", label: "Work Reports" },
  { key: "/admin/warranty-certificates", label: "Warranty Certificates" },
  { key: "/admin/reports", label: "Reports" },
  { key: "/admin/financial-reports", label: "Financial Reports" },
  { key: "/admin/marketing", label: "Marketing" },
  { key: "/admin/wallets", label: "Wallets" },
  { key: "/admin/vehicles", label: "Vehicles" },
  { key: "/admin/vehicles/expense-report", label: "Vehicle Expense Report" },
  { key: "/admin/rental-expenses", label: "Rental Expenses" },
  { key: "/admin/inventory", label: "Inventory" },
  { key: "/admin/settings", label: "Settings" },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

// Longest-prefix match against a pathname -- e.g. "/admin/vehicles/expense-report"
// resolves to the Vehicle Expense Report section (not Vehicles), while
// "/admin/vehicles/abc123" resolves to Vehicles. Returns null for a path that
// doesn't fall under any known section (e.g. a brand-new route not yet added
// to this list) -- callers should fail OPEN in that case, matching the
// "unrestricted until configured" default rather than accidentally locking
// out a section nobody has set up permissions for yet.
export function resolveAdminSectionKey(pathname: string): AdminSectionKey | null {
  let best: AdminSectionKey | null = null;
  for (const section of ADMIN_SECTIONS) {
    const isMatch = pathname === section.key || pathname.startsWith(`${section.key}/`);
    if (isMatch && (!best || section.key.length > best.length)) best = section.key;
  }
  return best;
}

// Empty allowedSections = unrestricted (the default -- see schema comment).
export function canAccessAdminSection(allowedSections: string[], pathname: string): boolean {
  if (allowedSections.length === 0) return true;
  const key = resolveAdminSectionKey(pathname);
  if (!key) return true;
  return allowedSections.includes(key);
}
