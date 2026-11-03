import { prisma } from "./prisma";
import { formatAed, formatDate } from "./format";
import { getVehicleAlerts } from "./vehicleData";
import { getEmployeesRequiringStock } from "./inventoryData";
import { getCollectMoneyTotal } from "./walletData";
import { partialCollectedTotal } from "./invoiceCollections";
import type { InsightKind } from "./pageInsights";

// What each system's overview page shows: a few stat cards, the charts, and one recent list -- all read from the tables the
// system's own pages already use. Nothing here is written anywhere.
export type OverviewStat = { label: string; value: string; valueClassName: string };
export type OverviewRow = { primary: string; secondary?: string; right?: string; href?: string };
export type Overview = { stats: OverviewStat[]; insights: InsightKind[]; recent?: { title: string; href: string; rows: OverviewRow[] } };

const n = (v: number) => String(v);
const THIRTY = () => new Date(Date.now() - 30 * 86_400_000);
const customerName = (c: { type: string; name: string; companyName: string | null }) => (c.type === "COMPANY" ? c.companyName || c.name : c.name);

async function revenueAndExpenses() {
  const [rev, partial, exp] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "Paid" } }),
    partialCollectedTotal(),
    prisma.expense.aggregate({ _sum: { amount: true, refundedAmount: true } }),
  ]);
  return { revenue: (rev._sum.amount ?? 0) + partial, expenses: (exp._sum.amount ?? 0) - (exp._sum.refundedAmount ?? 0) };
}

export async function getSystemOverview(id: string): Promise<Overview | null> {
  switch (id) {
    case "orders": {
      const [orders, active, customers, pending, owing, recent] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: { in: ["On The Way", "Arrived", "In Progress"] } } }),
        prisma.customer.count(),
        prisma.quotation.count({ where: { invoiceId: null } }),
        prisma.invoice.aggregate({ _sum: { amount: true, paidAmount: true }, where: { status: "Unpaid" } }),
        prisma.order.findMany({ orderBy: { date: "desc" }, take: 6, include: { customer: true } }),
      ]);
      return {
        stats: [
          { label: "Total Orders", value: n(orders), valueClassName: "text-purple-600" },
          { label: "In Progress", value: n(active), valueClassName: "text-orange-600" },
          { label: "Customers", value: n(customers), valueClassName: "text-blue-700" },
          { label: "Pending Quotations", value: n(pending), valueClassName: "text-blue-700" },
          { label: "Unpaid Amount", value: formatAed((owing._sum.amount ?? 0) - (owing._sum.paidAmount ?? 0)), valueClassName: "text-red-600" },
        ],
        insights: ["orders", "customers"],
        recent: { title: "Recent orders", href: "/admin/orders", rows: recent.map((o) => ({ primary: customerName(o.customer), secondary: o.number, right: `${o.status} · ${formatDate(o.date)}`, href: `/admin/orders/${o.id}` })) },
      };
    }
    case "hr": {
      const [active, total, salary] = await Promise.all([
        prisma.employee.count({ where: { status: { equals: "active", mode: "insensitive" } } }),
        prisma.employee.count(),
        prisma.employee.aggregate({ _sum: { monthlySalary: true }, where: { status: { equals: "active", mode: "insensitive" } } }),
      ]);
      return {
        stats: [
          { label: "Active Employees", value: n(active), valueClassName: "text-green-600" },
          { label: "Employees", value: n(total), valueClassName: "text-blue-700" },
          { label: "Monthly Salaries", value: formatAed(salary._sum.monthlySalary ?? 0), valueClassName: "text-orange-600" },
        ],
        insights: ["employees", "payroll"],
      };
    }
    case "jobs": {
      const [open, fresh, applicants, recent] = await Promise.all([
        prisma.job.count({ where: { status: "PUBLISHED" } }),
        prisma.jobApplication.count({ where: { status: "NEW" } }),
        prisma.jobApplicant.count(),
        prisma.jobApplication.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { applicant: { select: { fullName: true } }, job: { select: { titleEn: true, titleAr: true } } } }),
      ]);
      return {
        stats: [
          { label: "Published Jobs", value: n(open), valueClassName: "text-purple-600" },
          { label: "New Applications", value: n(fresh), valueClassName: "text-orange-600" },
          { label: "Workers", value: n(applicants), valueClassName: "text-blue-700" },
        ],
        insights: ["jobs"],
        recent: recent.length ? { title: "Recent applications", href: "/admin/jobs/applications", rows: recent.map((a) => ({ primary: a.applicant.fullName, secondary: a.job.titleEn || a.job.titleAr || undefined, right: `${a.status} · ${formatDate(a.createdAt)}`, href: `/admin/jobs/applications/${a.id}` })) } : undefined,
      };
    }
    case "finance": {
      const [{ revenue, expenses }, owing, wallet, recent] = await Promise.all([
        revenueAndExpenses(),
        prisma.invoice.aggregate({ _sum: { amount: true, paidAmount: true }, where: { status: "Unpaid" } }),
        getCollectMoneyTotal(),
        prisma.expense.findMany({ orderBy: { date: "desc" }, take: 6, select: { id: true, description: true, date: true, amount: true, vendor: true } }),
      ]);
      return {
        stats: [
          { label: "Total Revenue", value: formatAed(revenue), valueClassName: "text-green-600" },
          { label: "All Expenses", value: formatAed(expenses), valueClassName: "text-red-500" },
          { label: "Unpaid Amount", value: formatAed((owing._sum.amount ?? 0) - (owing._sum.paidAmount ?? 0)), valueClassName: "text-red-600" },
          { label: "Collect Money Total", value: formatAed(wallet), valueClassName: "text-blue-700" },
        ],
        insights: ["finance", "wallets"],
        recent: { title: "Recent expenses", href: "/admin/expenses", rows: recent.map((e) => ({ primary: e.description, secondary: e.vendor ?? undefined, right: `${formatAed(e.amount)} · ${formatDate(e.date)}` })) },
      };
    }
    case "reports": {
      const [{ revenue, expenses }, orders, reports] = await Promise.all([revenueAndExpenses(), prisma.order.count(), prisma.workReport.count()]);
      return {
        stats: [
          { label: "Total Revenue", value: formatAed(revenue), valueClassName: "text-green-600" },
          { label: "All Expenses", value: formatAed(expenses), valueClassName: "text-red-500" },
          { label: "Total Orders", value: n(orders), valueClassName: "text-purple-600" },
          { label: "Work Reports", value: n(reports), valueClassName: "text-blue-700" },
        ],
        insights: ["finance", "orders"],
      };
    }
    case "marketing": {
      const [posts, drafts, leads] = await Promise.all([
        prisma.blogPost.count({ where: { published: true } }),
        prisma.blogPost.count({ where: { published: false } }),
        prisma.cmsFormSubmission.count({ where: { createdAt: { gte: THIRTY() } } }),
      ]);
      return {
        stats: [
          { label: "Published Posts", value: n(posts), valueClassName: "text-pink-600" },
          { label: "Draft Posts", value: n(drafts), valueClassName: "text-orange-600" },
          { label: "Leads (30 days)", value: n(leads), valueClassName: "text-blue-700" },
        ],
        insights: ["marketing", "blog"],
      };
    }
    case "website": {
      const [pages, published, posts, fresh, recent] = await Promise.all([
        prisma.cmsPage.count({ where: { deletedAt: null } }),
        prisma.cmsPage.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
        prisma.blogPost.count({ where: { published: true } }),
        prisma.cmsFormSubmission.count({ where: { status: "NEW" } }),
        prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, titleEn: true, titleAr: true, status: true, updatedAt: true } }),
      ]);
      return {
        stats: [
          { label: "Pages", value: n(pages), valueClassName: "text-blue-700" },
          { label: "Published Pages", value: n(published), valueClassName: "text-green-600" },
          { label: "Published Posts", value: n(posts), valueClassName: "text-pink-600" },
          { label: "New Submissions", value: n(fresh), valueClassName: "text-orange-600" },
        ],
        insights: ["website", "blog"],
        recent: { title: "Recently updated pages", href: "/admin/website/pages", rows: recent.map((p) => ({ primary: p.titleEn || p.titleAr, right: `${p.status} · ${formatDate(p.updatedAt)}`, href: `/admin/website/pages/${p.id}` })) },
      };
    }
    case "fleet": {
      const [total, active, alerts] = await Promise.all([prisma.vehicle.count(), prisma.vehicle.count({ where: { status: "Active" } }), getVehicleAlerts()]);
      return {
        stats: [
          { label: "Vehicles", value: n(total), valueClassName: "text-blue-700" },
          { label: "Active Vehicles", value: n(active), valueClassName: "text-green-600" },
          { label: "Vehicle Alerts", value: n(alerts.length), valueClassName: "text-orange-600" },
        ],
        insights: ["vehicles"],
        recent: alerts.length ? { title: "Vehicle alerts", href: "/admin/vehicles", rows: alerts.slice(0, 8).map((a) => ({ primary: a.vehicleName, secondary: a.kind, right: a.detail, href: `/admin/vehicles/${a.vehicleId}` })) } : undefined,
      };
    }
    case "inventory": {
      const [items, suppliers, services, moves, short] = await Promise.all([
        prisma.inventoryItem.count({ where: { status: "Active" } }),
        prisma.supplier.count({ where: { status: "Active" } }),
        prisma.catalogService.count({ where: { active: true } }),
        prisma.inventoryTransaction.count({ where: { createdAt: { gte: THIRTY() } } }),
        getEmployeesRequiringStock().then((r) => r.length).catch(() => 0),
      ]);
      return {
        stats: [
          { label: "Stock Items", value: n(items), valueClassName: "text-teal-600" },
          { label: "Suppliers", value: n(suppliers), valueClassName: "text-purple-600" },
          { label: "Service Catalogue", value: n(services), valueClassName: "text-blue-700" },
          { label: "Movements (30 days)", value: n(moves), valueClassName: "text-green-600" },
          { label: "Employees Requiring Stock", value: n(short), valueClassName: "text-orange-600" },
        ],
        insights: ["inventory", "catalog"],
      };
    }
    case "system": {
      const [active, admins, audit, recent] = await Promise.all([
        prisma.employee.count({ where: { status: { equals: "active", mode: "insensitive" } } }),
        prisma.employee.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: THIRTY() } } }),
        prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      ]);
      return {
        stats: [
          { label: "Active Employees", value: n(active), valueClassName: "text-green-600" },
          { label: "Admins", value: n(admins), valueClassName: "text-blue-700" },
          { label: "Audit Entries (30 days)", value: n(audit), valueClassName: "text-orange-600" },
        ],
        insights: ["audit"],
        recent: { title: "Recent activity", href: "/admin/audit-log", rows: recent.map((a) => ({ primary: `${a.action} · ${a.entity}`, secondary: a.actorName ?? undefined, right: formatDate(a.createdAt) })) },
      };
    }
    default:
      return null;
  }
}
