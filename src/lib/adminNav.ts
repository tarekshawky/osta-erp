import { canAccessAdminSection } from "@/lib/adminSections";

// The admin sidebar: a Dashboard link plus grouped modules. A page may appear in more than one module (for example Work
// Reports under Orders and under Reports); it is always the same page, never a second copy.

export type NavIcon =
  | "dashboard" | "orders" | "hr" | "jobs" | "finance" | "reports" | "marketing" | "website" | "fleet" | "inventory" | "system";

export type NavLeaf = {
  href: string;
  label: string;
  // Extra words the search also matches.
  keywords?: string;
  // Pages nested under this one (shown while the visitor is inside it).
  children?: { href: string; label: string }[];
};

export type NavGroup = { id: string; label: string; labelAr?: string; icon: NavIcon; items: NavLeaf[] };

export const DASHBOARD: NavLeaf = { href: "/admin", label: "Dashboard", keywords: "overview kpi key performance indicators business summary home" };

const INVENTORY_PAGES = [
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
];

const WORK_REPORTS: NavLeaf = { href: "/admin/work-reports", label: "Work Reports", keywords: "technician job report" };
const FINANCIAL_REPORTS: NavLeaf = { href: "/admin/financial-reports", label: "Financial Reports", keywords: "profit loss balance" };
const VEHICLE_EXPENSES: NavLeaf = { href: "/admin/vehicles/expense-report", label: "Vehicle Expense Report", keywords: "fuel car costs" };
const RENTAL_EXPENSES: NavLeaf = { href: "/admin/rental-expenses", label: "Rental Expenses", keywords: "rent" };
const WEBSITE_SERVICES: NavLeaf = { href: "/admin/services", label: "Website Services", keywords: "service pages" };
const BLOG: NavLeaf = { href: "/admin/blog", label: "Blog Management", keywords: "articles posts" };
const BLOG_CATEGORIES: NavLeaf = { href: "/admin/blog/categories", label: "Blog Categories", keywords: "sections topics" };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "orders", label: "Orders & Bookings", icon: "orders",
    items: [
      { href: "/admin/orders", label: "Service Orders", keywords: "bookings requests jobs" },
      { href: "/admin/customers", label: "Customers", keywords: "clients" },
      { href: "/admin/quotations", label: "Quotations", keywords: "quotes estimates" },
      { href: "/admin/invoices", label: "Invoices", keywords: "billing payments" },
      { href: "/admin/warranty-certificates", label: "Warranty Certificates", keywords: "guarantee" },
      WORK_REPORTS,
    ],
  },
  {
    id: "hr", label: "HR & Employees", icon: "hr",
    items: [
      { href: "/admin/employees", label: "Employees", keywords: "staff team technicians" },
      { href: "/admin/payroll", label: "Payroll", keywords: "salaries wages" },
    ],
  },
  {
    id: "jobs", label: "Jobs & Workforce", labelAr: "إدارة الوظائف والعمالة", icon: "jobs",
    items: [
      { href: "/admin/jobs", label: "Overview", keywords: "jobs workforce hiring dashboard" },
      { href: "/admin/jobs/list", label: "All Jobs", keywords: "vacancies positions daily permanent وظائف" },
      { href: "/admin/jobs/new", label: "Create Job", keywords: "new job post hire" },
      { href: "/admin/jobs/applications", label: "Applications", keywords: "applicants candidates cv photos طلبات" },
      { href: "/admin/jobs/workers", label: "Workers Database", keywords: "applicants technicians painters عمالة" },
      { href: "/admin/jobs/reports", label: "Jobs Reports", keywords: "hiring statistics export" },
      { href: "/admin/jobs/settings", label: "Jobs Settings", keywords: "categories skills upload retention notifications" },
    ],
  },
  {
    id: "finance", label: "Finance & Accounting", icon: "finance",
    items: [FINANCIAL_REPORTS, { href: "/admin/expenses", label: "Expenses", keywords: "costs spending" }, { href: "/admin/wallets", label: "Wallets", keywords: "cash money" }, RENTAL_EXPENSES, VEHICLE_EXPENSES],
  },
  {
    id: "reports", label: "Reports & Analytics", icon: "reports",
    items: [{ href: "/admin/reports", label: "General Reports", keywords: "analytics statistics" }, WORK_REPORTS, FINANCIAL_REPORTS, VEHICLE_EXPENSES],
  },
  {
    id: "marketing", label: "Marketing & Blog", icon: "marketing",
    items: [{ href: "/admin/marketing", label: "Marketing", keywords: "ads campaigns roi" }, BLOG, BLOG_CATEGORIES],
  },
  {
    id: "website", label: "Website Management", icon: "website",
    items: [
      { href: "/admin/website", label: "Website Overview", keywords: "cms menus media forms leads redirects backup" },
      { href: "/admin/website/pages", label: "Pages & SEO Settings", keywords: "page builder seo" },
      { href: "/admin/website/structure", label: "Website Structure", keywords: "page tree hierarchy parent child sub pages drag drop navigation" },
      { href: "/admin/website/seo", label: "SEO & Technical Files", keywords: "sitemap schema score structured data" },
      WEBSITE_SERVICES,
      { href: "/admin/home-sections", label: "Homepage Sections", keywords: "home" },
      BLOG,
      BLOG_CATEGORIES,
      { href: "/admin/website/technical", label: "Technical Files & AI Management", keywords: "robots.txt llms.txt ads.txt ai crawlers" },
      { href: "/admin/website/code", label: "Global Header & Footer Code", keywords: "scripts tracking pixel head body custom code" },
      { href: "/admin/website/page-code", label: "Page-Level Header & Footer Code", keywords: "scripts per page custom code" },
    ],
  },
  {
    id: "fleet", label: "Fleet & Vehicles", icon: "fleet",
    items: [{ href: "/admin/vehicles", label: "Vehicles", keywords: "cars fleet" }, VEHICLE_EXPENSES, RENTAL_EXPENSES],
  },
  {
    id: "inventory", label: "Inventory & Services", icon: "inventory",
    items: [{ href: "/admin/inventory", label: "Inventory", keywords: "stock warehouse items", children: INVENTORY_PAGES }, WEBSITE_SERVICES, { href: "/admin/pricing", label: "Dynamic Pricing", keywords: "prices rates fees" }],
  },
  {
    id: "system", label: "System Administration", icon: "system",
    items: [{ href: "/admin/settings", label: "Settings", keywords: "tax logo company" }, { href: "/admin/audit-log", label: "Audit Log", keywords: "history changes security" }],
  },
];

const pathOf = (href: string) => href.split("?")[0];

// Hiding an item is only a convenience: every route is also protected on the server (admin layout + permissions).
export function leafAllowed(href: string, adminSections: string[], isSuperAdmin: boolean): boolean {
  return isSuperAdmin || canAccessAdminSection(adminSections, pathOf(href));
}

export function visibleNav(adminSections: string[], isSuperAdmin: boolean): { dashboard: boolean; groups: NavGroup[] } {
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => leafAllowed(i.href, adminSections, isSuperAdmin)) })).filter((g) => g.items.length > 0);
  return { dashboard: leafAllowed(DASHBOARD.href, adminSections, isSuperAdmin), groups };
}

const matches = (pathname: string, href: string) => {
  const p = pathOf(href);
  return p === "/admin" ? pathname === "/admin" : pathname === p || pathname.startsWith(`${p}/`);
};

// Which page and which module are current. The most specific page wins (/admin/blog/categories over /admin/blog). When
// the same page sits in several modules, the one the visitor opened it from (`preferredGroupId`) is current.
export function locate(groups: NavGroup[], pathname: string, preferredGroupId?: string | null): { groupId: string; href: string } | null {
  let best: { groupId: string; href: string; len: number } | null = null;
  for (const g of groups) {
    for (const item of g.items) {
      if (!matches(pathname, item.href)) continue;
      const len = pathOf(item.href).length;
      const better = !best || len > best.len || (len === best.len && g.id === preferredGroupId && best.groupId !== preferredGroupId);
      if (better) best = { groupId: g.id, href: item.href, len };
    }
  }
  return best ? { groupId: best.groupId, href: best.href } : null;
}

export type NavHit = { href: string; label: string; group: string };

// Search over every page the user may see: by name, module name and keywords. A page in several modules appears once.
export function searchNav(groups: NavGroup[], query: string, limit = 12): NavHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const seen = new Set<string>();
  const hits: { hit: NavHit; score: number }[] = [];
  const consider = (href: string, label: string, group: string, extra = "") => {
    const key = pathOf(href) + "|" + label;
    if (seen.has(key)) return;
    const hay = `${label} ${group} ${extra}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return;
    seen.add(key);
    hits.push({ hit: { href, label, group }, score: label.toLowerCase().startsWith(q) ? 0 : label.toLowerCase().includes(q) ? 1 : 2 });
  };
  for (const g of groups) for (const i of g.items) {
    consider(i.href, i.label, g.label, i.keywords);
    for (const c of i.children ?? []) consider(c.href, c.label, `${g.label} › ${i.label}`);
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.hit);
}
