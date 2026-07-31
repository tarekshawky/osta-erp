import { prisma } from "./prisma";
import { buildDateRange } from "./dateRangeFilter";
import { MARKETING_EXPENSE_CATEGORY } from "./expenseData";
import { LEAD_SOURCES, type LeadSource } from "./invoiceData";

export function slugifyLeadSource(source: string): string {
  return source.toLowerCase().replace(/\s+/g, "-");
}

export function unslugifyLeadSource(slug: string): LeadSource | null {
  return LEAD_SOURCES.find((s) => slugifyLeadSource(s) === slug) ?? null;
}

export type CampaignRow = {
  campaign: LeadSource;
  slug: string;
  spend: number;
  invoiceCount: number;
  revenue: number;
  netRevenue: number;
  roi: number | null;
};

export type MarketingDashboardData = {
  totalMarketingSpend: number;
  totalCustomers: number;
  totalInvoices: number;
  totalRevenue: number;
  netRevenue: number;
  roi: number | null;
  campaigns: CampaignRow[];
};

export async function computeMarketingDashboard(
  year: number | null,
  month: number | null
): Promise<MarketingDashboardData> {
  const dateRange = buildDateRange(year, month);
  const dateFilter = dateRange ? { date: dateRange } : {};

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: dateFilter,
      select: { customerId: true, amount: true, refundedAmount: true, leadSource: true },
    }),
    prisma.expense.findMany({
      where: { ...dateFilter, category: MARKETING_EXPENSE_CATEGORY },
      select: { amount: true, refundedAmount: true },
    }),
  ]);

  const totalMarketingSpend = expenses.reduce((sum, e) => sum + (e.amount - e.refundedAmount), 0);

  // Only one paid channel is tracked today (Meta Ads), so all Marketing Advertising
  // spend is attributed there -- "Organic" is unpaid by definition and always shows
  // zero spend / N/A ROI.
  const campaigns: CampaignRow[] = LEAD_SOURCES.map((source) => {
    const sourceInvoices = invoices.filter((inv) => (inv.leadSource || "Organic") === source);
    const revenue = sourceInvoices.reduce((sum, inv) => sum + (inv.amount - inv.refundedAmount), 0);
    const spend = source === "Organic" ? 0 : totalMarketingSpend;
    const netRevenue = revenue - spend;
    const roi = spend > 0 ? (netRevenue / spend) * 100 : null;
    return {
      campaign: source,
      slug: slugifyLeadSource(source),
      spend,
      invoiceCount: sourceInvoices.length,
      revenue,
      netRevenue,
      roi,
    };
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount - inv.refundedAmount), 0);
  const totalInvoices = invoices.length;
  const totalCustomers = new Set(invoices.map((inv) => inv.customerId)).size;
  const netRevenue = totalRevenue - totalMarketingSpend;
  const roi = totalMarketingSpend > 0 ? (netRevenue / totalMarketingSpend) * 100 : null;

  return { totalMarketingSpend, totalCustomers, totalInvoices, totalRevenue, netRevenue, roi, campaigns };
}

export type CampaignExpenseRow = {
  id: string;
  date: Date;
  description: string;
  payment: string;
  amount: number;
};

export type CampaignInvoiceRow = {
  id: string;
  number: string;
  date: Date;
  customerName: string;
  grandTotal: number;
  status: string;
};

export type CampaignDetailData = {
  campaign: LeadSource;
  expenses: CampaignExpenseRow[];
  totalMarketingSpend: number;
  invoices: CampaignInvoiceRow[];
  totalInvoices: number;
  totalRevenue: number;
  netRevenue: number;
  numberOfCustomers: number;
  averageInvoiceValue: number;
  roi: number | null;
};

export async function computeCampaignDetail(
  campaign: LeadSource,
  year: number | null,
  month: number | null
): Promise<CampaignDetailData> {
  const dateRange = buildDateRange(year, month);
  const dateFilter = dateRange ? { date: dateRange } : {};
  const isPaidChannel = campaign !== "Organic";

  const [expenseRows, invoiceRows] = await Promise.all([
    isPaidChannel
      ? prisma.expense.findMany({
          where: { ...dateFilter, category: MARKETING_EXPENSE_CATEGORY },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    prisma.invoice.findMany({
      where: { ...dateFilter, leadSource: campaign },
      orderBy: { date: "desc" },
      include: { customer: true },
    }),
  ]);

  const expenses: CampaignExpenseRow[] = expenseRows.map((e) => ({
    id: e.id,
    date: e.date,
    description: e.description,
    payment: e.payment,
    amount: e.amount - e.refundedAmount,
  }));
  const totalMarketingSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  const invoices: CampaignInvoiceRow[] = invoiceRows.map((inv) => ({
    id: inv.id,
    number: inv.number,
    date: inv.date,
    customerName: inv.customer.type === "COMPANY" ? inv.customer.companyName || inv.customer.name : inv.customer.name,
    grandTotal: inv.amount - inv.refundedAmount,
    status: inv.status,
  }));

  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const netRevenue = totalRevenue - totalMarketingSpend;
  const numberOfCustomers = new Set(invoiceRows.map((inv) => inv.customerId)).size;
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const roi = totalMarketingSpend > 0 ? (netRevenue / totalMarketingSpend) * 100 : null;

  return {
    campaign,
    expenses,
    totalMarketingSpend,
    invoices,
    totalInvoices,
    totalRevenue,
    netRevenue,
    numberOfCustomers,
    averageInvoiceValue,
    roi,
  };
}
