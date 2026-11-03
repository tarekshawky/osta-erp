import { prisma } from "./prisma";
import { revenueByMonth, expensesByMonth } from "./monthlySeries";
import { getPaymentTotals } from "./reportData";

// Chart data for the "insight" band at the top of each admin page: monthly trends and share breakdowns, all read from the
// same tables the page itself lists. Nothing here writes anything.
export type Point = { label: string; value: number };

function sixMonths() {
  const now = new Date();
  const list: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d), value: 0 });
  }
  return { list, from: new Date(now.getFullYear(), now.getMonth() - 5, 1) };
}
const k = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

// rows -> six monthly buckets, counting each row (weight 1) or summing a number
export function bucketMonths(from: Date, list: { key: string; label: string; value: number }[], rows: { date: Date; v?: number }[]): Point[] {
  void from;
  for (const r of rows) {
    const b = list.find((x) => x.key === k(r.date));
    if (b) b.value += r.v ?? 1;
  }
  return list.map((b) => ({ label: b.label, value: Math.round(b.value) }));
}

async function monthly(fetch: (from: Date) => Promise<{ date: Date; v?: number }[]>): Promise<Point[]> {
  const { list, from } = sixMonths();
  return bucketMonths(from, list, await fetch(from));
}

const group = (items: (string | null | undefined)[], fallback = "Other"): Point[] => {
  const m = new Map<string, number>();
  for (const i of items) m.set(i?.trim() || fallback, (m.get(i?.trim() || fallback) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7);
};

export type Insight = {
  bars?: { title: string; points: Point[]; tone: "blue" | "green" | "orange" | "purple" | "pink" | "teal"; unit?: string; subtitle?: string };
  bars2?: { title: string; points: Point[]; tone: "blue" | "green" | "orange" | "purple" | "pink" | "teal"; unit?: string; subtitle?: string };
  donut?: { title: string; slices: Point[]; unit?: string };
};

export type InsightKind =
  | "orders" | "customers" | "quotations" | "employees" | "payroll" | "vehicles" | "inventory" | "marketing" | "finance"
  | "wallets" | "website" | "workReports" | "warranty" | "jobs" | "rentals" | "catalog" | "audit" | "blog";

export async function getInsight(kind: InsightKind): Promise<Insight> {
  switch (kind) {
    case "orders": {
      const [bars, orders] = await Promise.all([
        monthly((from) => prisma.order.findMany({ where: { date: { gte: from } }, select: { date: true } })),
        prisma.order.findMany({ select: { status: true } }),
      ]);
      return { bars: { title: "Orders overview", points: bars, tone: "purple", unit: "orders" }, donut: { title: "Orders by status", slices: group(orders.map((o) => o.status)), unit: "orders" } };
    }
    case "customers": {
      const [bars, all] = await Promise.all([
        monthly((from) => prisma.customer.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
        prisma.customer.findMany({ select: { leadSource: true } }),
      ]);
      return { bars: { title: "New customers", points: bars, tone: "teal", unit: "customers" }, donut: { title: "Customers by lead source", slices: group(all.map((c) => c.leadSource)), unit: "customers" } };
    }
    case "quotations": {
      const [bars, pending, converted] = await Promise.all([
        monthly((from) => prisma.quotation.findMany({ where: { date: { gte: from } }, select: { date: true } })),
        prisma.quotation.count({ where: { invoiceId: null } }),
        prisma.quotation.count({ where: { invoiceId: { not: null } } }),
      ]);
      return { bars: { title: "Quotations overview", points: bars, tone: "blue", unit: "quotations" }, donut: { title: "Quotation outcome", slices: [{ label: "Turned into invoice", value: converted }, { label: "Pending", value: pending }], unit: "quotes" } };
    }
    case "employees": {
      const [emps, teams] = await Promise.all([prisma.employee.findMany({ select: { status: true, teamId: true, role: true } }), prisma.team.findMany({ select: { id: true, name: true } })]);
      const name = new Map(teams.map((t) => [t.id, t.name]));
      return {
        donut: { title: "Employees by team", slices: group(emps.map((e) => (e.teamId ? name.get(e.teamId) : "No team"))), unit: "employees" },
        bars: { title: "Employees by status", points: group(emps.map((e) => e.status)), tone: "orange", unit: "employees", subtitle: "All employees" },
      };
    }
    case "payroll": {
      const bars = await monthly((from) => prisma.payrollEntry.findMany({ where: { date: { gte: from }, type: { in: ["Salary", "Advance"] } }, select: { date: true, amount: true } }).then((r) => r.map((x) => ({ date: x.date, v: x.amount }))));
      return { bars: { title: "Salaries & advances paid", points: bars, tone: "orange" } };
    }
    case "vehicles": {
      const [vs, bars] = await Promise.all([
        prisma.vehicle.findMany({ select: { status: true } }),
        monthly((from) => prisma.expense.findMany({ where: { date: { gte: from }, category: "Vehicle" }, select: { date: true, amount: true, refundedAmount: true } }).then((r) => r.map((x) => ({ date: x.date, v: x.amount - x.refundedAmount })))),
      ]);
      return { bars: { title: "Vehicle expenses", points: bars, tone: "blue" }, donut: { title: "Vehicles by status", slices: group(vs.map((v) => v.status)), unit: "vehicles" } };
    }
    case "inventory": {
      const [items, bars] = await Promise.all([
        prisma.inventoryItem.findMany({ select: { status: true } }),
        monthly((from) => prisma.inventoryTransaction.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
      ]);
      return { bars: { title: "Stock movements", points: bars, tone: "teal", unit: "movements" }, donut: { title: "Items by status", slices: group(items.map((i) => i.status)), unit: "items" } };
    }
    case "marketing": {
      const [orders, bars] = await Promise.all([
        prisma.order.findMany({ select: { leadSource: true } }),
        monthly((from) => prisma.cmsFormSubmission.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
      ]);
      return { bars: { title: "Website leads", points: bars, tone: "pink", unit: "leads" }, donut: { title: "Orders by lead source", slices: group(orders.map((o) => o.leadSource)), unit: "orders" } };
    }
    case "finance": {
      const [rev, exp] = await Promise.all([revenueByMonth(), expensesByMonth()]);
      return { bars: { title: "Revenue overview", points: rev, tone: "blue" }, bars2: { title: "Expenses overview", points: exp, tone: "orange" } };
    }
    case "wallets": {
      const t = await getPaymentTotals();
      const [exp] = await Promise.all([expensesByMonth()]);
      return {
        donut: { title: "Collected by payment method", slices: [{ label: "Cash", value: Math.round(t.cash) }, { label: "Ziina", value: Math.round(t.ziina) }, { label: "Bank Transfer", value: Math.round(t.bankTransfer) }], unit: "AED" },
        bars: { title: "Expenses overview", points: exp, tone: "orange" },
      };
    }
    case "website": {
      const [pages, bars] = await Promise.all([
        prisma.cmsPage.findMany({ where: { deletedAt: null }, select: { status: true } }),
        monthly((from) => prisma.cmsFormSubmission.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
      ]);
      return { bars: { title: "Form submissions", points: bars, tone: "blue", unit: "submissions" }, donut: { title: "Pages by status", slices: group(pages.map((p) => p.status)), unit: "pages" } };
    }
    case "blog": {
      const [posts, bars] = await Promise.all([
        prisma.blogPost.findMany({ select: { published: true } }),
        monthly((from) => prisma.blogPost.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
      ]);
      return { bars: { title: "Posts created", points: bars, tone: "pink", unit: "posts" }, donut: { title: "Posts by status", slices: group(posts.map((p) => (p.published ? "Published" : "Draft"))), unit: "posts" } };
    }
    case "workReports": {
      const bars = await monthly((from) => prisma.workReport.findMany({ where: { date: { gte: from } }, select: { date: true } }));
      return { bars: { title: "Work reports", points: bars, tone: "purple", unit: "reports" } };
    }
    case "warranty": {
      const bars = await monthly((from) => prisma.warrantyCertificate.findMany({ where: { date: { gte: from } }, select: { date: true } }));
      return { bars: { title: "Warranty certificates issued", points: bars, tone: "green", unit: "certificates" } };
    }
    case "jobs": {
      const [apps, bars] = await Promise.all([
        prisma.jobApplication.findMany({ select: { status: true } }),
        monthly((from) => prisma.jobApplication.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt })))),
      ]);
      return { bars: { title: "Applications received", points: bars, tone: "orange", unit: "applications" }, donut: { title: "Applications by status", slices: group(apps.map((a) => a.status)), unit: "applications" } };
    }
    case "rentals": {
      const bars = await monthly((from) => prisma.rentalTransaction.findMany({ where: { dueDate: { gte: from }, paymentStatus: { not: "Cancelled" } }, select: { dueDate: true, amount: true } }).then((r) => r.map((x) => ({ date: x.dueDate, v: x.amount }))));
      return { bars: { title: "Rent due per month", points: bars, tone: "orange" } };
    }
    case "catalog": {
      const svcs = await prisma.catalogService.findMany({ select: { active: true, groupEn: true } });
      return { donut: { title: "Services by group", slices: group(svcs.map((s) => s.groupEn), "Ungrouped"), unit: "services" }, bars: { title: "Services by state", points: group(svcs.map((s) => (s.active ? "Active" : "Inactive"))), tone: "teal", unit: "services", subtitle: "All services" } };
    }
    case "audit": {
      const bars = await monthly((from) => prisma.auditLog.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }).then((r) => r.map((x) => ({ date: x.createdAt }))));
      return { bars: { title: "Admin activity", points: bars, tone: "blue", unit: "actions" } };
    }
  }
}
