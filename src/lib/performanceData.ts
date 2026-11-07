import { collectedOf } from "./invoicePayment";

// The performance engine: pure functions over plain rows, so every rule below is unit-tested. The loader (performanceLoader.ts)
// reads the rows from the database; nothing here touches it.
//
// How things are allocated (the data has no "emirate" on a team, and expenses carry only a team):
//  * An invoice or order belongs to the EMIRATE of its customer, and to the TEAM that did it.
//  * A team is an "operational" team when its name is an Emirate's name (Ajman, Al Ain, ...); any other team (for example
//    Admin) and expenses with no team are SHARED / head-office costs.
//  * An operational team's costs are spread over the emirates in proportion to that team's invoiced revenue in each one, so
//    every cost is counted exactly once: emirates + unallocated + shared = all costs.

export const EMIRATES = ["Ajman", "Dubai", "Sharjah", "Abu Dhabi", "Al Ain", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"] as const;
export const OTHER_EMIRATE = "Other";
const emirateOf = (v: string | null | undefined) => ((EMIRATES as readonly string[]).includes(v ?? "") ? (v as string) : OTHER_EMIRATE);

export const COST_BUCKETS = ["Fuel", "Vehicle & maintenance", "Materials & spare parts", "Employee-related", "Accommodation & rent", "Other"] as const;
export type CostBucket = (typeof COST_BUCKETS)[number];

export function bucketOf(source: "Expense" | "Payroll", category: string | null, subcategory: string | null): CostBucket {
  if (source === "Payroll") return "Employee-related";
  const c = (category ?? "").toLowerCase();
  if (c === "vehicle") return /fuel|petrol/i.test(subcategory ?? "") ? "Fuel" : "Vehicle & maintenance";
  if (c === "materials") return "Materials & spare parts";
  if (/rent|accommodation/.test(c)) return "Accommodation & rent";
  return "Other";
}

export type OrderRow = { id: string; number: string; date: Date; status: string; teamId: string | null; emirate: string | null; employeeId: string | null; customerName: string };
export type InvoiceRow = {
  id: string; number: string; date: Date; amount: number; refundedAmount: number; status: string; paidAmount: number;
  teamId: string | null; emirate: string | null; employeeId: string | null; customerName: string; payment: string;
};
export type CostRow = {
  id: string; date: Date; amount: number; teamId: string | null; employeeId: string | null; bucket: CostBucket;
  source: "Expense" | "Payroll"; category: string; description: string; vendor: string | null; attachmentUrl: string | null;
};
export type TeamInfo = { id: string; name: string };

export type PaymentStatusFilter = "Paid" | "Unpaid" | "PartiallyPaid";
export type PerfFilters = { emirate?: string; teamId?: string; employeeId?: string; orderStatus?: string; paymentStatus?: PaymentStatusFilter };

export type Metrics = {
  orders: number; completed: number; pending: number; cancelled: number;
  invoices: number; revenue: number; collected: number; outstanding: number;
  expenses: number; profit: number; avgInvoice: number; expensePct: number;
};
export type EmirateRow = Metrics & { emirate: string };
export type TeamRow = Metrics & { teamId: string | null; name: string; assignedEmirate: string | null; shared: boolean };
export type Performance = {
  totals: Metrics;
  emirates: EmirateRow[];
  teams: TeamRow[];
  sharedExpenses: number;      // head-office / unassigned costs (not in any emirate row)
  unallocatedExpenses: number; // an operational team's costs when it has no revenue to spread them over
  buckets: { label: string; value: number }[];
  monthly: { key: string; label: string; revenue: number; expenses: number; orders: number }[];
  best: { emirate: string | null; team: string | null };
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const net = (i: InvoiceRow) => i.amount - i.refundedAmount;
export const paymentStateOf = (i: InvoiceRow): PaymentStatusFilter => {
  const got = collectedOf(i);
  if (got <= 0) return "Unpaid";
  return got >= net(i) - 0.005 ? "Paid" : "PartiallyPaid";
};

type Acc = { orders: number; completed: number; pending: number; cancelled: number; invoices: number; revenue: number; collected: number; expenses: number };
const empty = (): Acc => ({ orders: 0, completed: 0, pending: 0, cancelled: 0, invoices: 0, revenue: 0, collected: 0, expenses: 0 });

function finish(a: Acc): Metrics {
  const revenue = round2(a.revenue);
  const collected = round2(a.collected);
  const expenses = round2(a.expenses);
  return {
    orders: a.orders, completed: a.completed, pending: a.pending, cancelled: a.cancelled, invoices: a.invoices,
    revenue, collected, outstanding: round2(Math.max(0, revenue - collected)), expenses, profit: round2(revenue - expenses),
    avgInvoice: a.invoices ? round2(revenue / a.invoices) : 0, expensePct: revenue > 0 ? round2((expenses / revenue) * 100) : 0,
  };
}
const addOrder = (a: Acc, o: OrderRow) => {
  a.orders++;
  if (o.status === "Done") a.completed++;
  else if (o.status === "Cancelled") a.cancelled++;
  else a.pending++;
};
const addInvoice = (a: Acc, i: InvoiceRow) => {
  a.invoices++;
  a.revenue += net(i);
  a.collected += collectedOf(i);
};

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string) => new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${k}-01T00:00:00Z`));

export function computePerformance(
  input: { orders: OrderRow[]; invoices: InvoiceRow[]; costs: CostRow[]; teams: TeamInfo[]; from: Date; to: Date },
  f: PerfFilters = {}
): Performance {
  // 1. filters that don't depend on the emirate
  const orders = input.orders.filter((o) => (!f.teamId || o.teamId === f.teamId) && (!f.employeeId || o.employeeId === f.employeeId) && (!f.orderStatus || f.orderStatus === "all" || o.status === f.orderStatus));
  const invoices = input.invoices.filter((i) => (!f.teamId || i.teamId === f.teamId) && (!f.employeeId || i.employeeId === f.employeeId) && (!f.paymentStatus || paymentStateOf(i) === f.paymentStatus));
  const costs = input.costs.filter((c) => (!f.teamId || c.teamId === f.teamId) && (!f.employeeId || c.employeeId === f.employeeId));

  const teamName = new Map(input.teams.map((t) => [t.id, t.name]));
  const isOperational = (teamId: string | null) => teamId !== null && (EMIRATES as readonly string[]).includes(teamName.get(teamId) ?? "");

  // 2. each team's invoiced revenue per emirate (the basis for spreading its costs)
  const revTE = new Map<string, Map<string, number>>();
  const revT = new Map<string, number>();
  for (const i of invoices) {
    if (!i.teamId) continue;
    const e = emirateOf(i.emirate);
    const row = revTE.get(i.teamId) ?? new Map<string, number>();
    row.set(e, (row.get(e) ?? 0) + net(i));
    revTE.set(i.teamId, row);
    revT.set(i.teamId, (revT.get(i.teamId) ?? 0) + net(i));
  }
  const costT = new Map<string | null, number>();
  for (const c of costs) costT.set(c.teamId, (costT.get(c.teamId) ?? 0) + c.amount);

  // share of team T's costs that belongs to emirate e (1 when no emirate is selected)
  const scope = f.emirate && f.emirate !== "all" ? f.emirate : null;
  const share = (teamId: string | null, e: string | null): number => {
    if (!e) return 1;
    if (!isOperational(teamId)) return 0;
    const total = revT.get(teamId!) ?? 0;
    return total > 0 ? (revTE.get(teamId!)?.get(e) ?? 0) / total : 0;
  };

  // 3. emirate rows
  const emirateNames = [...EMIRATES, OTHER_EMIRATE];
  const emirateAcc = new Map<string, Acc>(emirateNames.map((e) => [e, empty()]));
  for (const o of orders) addOrder(emirateAcc.get(emirateOf(o.emirate))!, o);
  for (const i of invoices) addInvoice(emirateAcc.get(emirateOf(i.emirate))!, i);
  let unallocated = 0;
  let shared = 0;
  for (const [teamId, cost] of costT) {
    if (!isOperational(teamId)) { shared += cost; continue; }
    const total = revT.get(teamId!) ?? 0;
    if (total <= 0) { unallocated += cost; continue; }
    for (const [e, rev] of revTE.get(teamId!)!) emirateAcc.get(e)!.expenses += cost * (rev / total);
  }
  const emirates: EmirateRow[] = emirateNames
    .map((e) => ({ emirate: e, ...finish(emirateAcc.get(e)!) }))
    .filter((r) => (EMIRATES as readonly string[]).includes(r.emirate) || r.orders > 0 || r.invoices > 0 || r.expenses > 0);

  // 4. team rows (scoped to the selected emirate when there is one)
  const teamIds = [...input.teams.map((t) => t.id), null as string | null];
  const teamAcc = new Map<string | null, Acc>(teamIds.map((id) => [id, empty()]));
  for (const o of orders) if (!scope || emirateOf(o.emirate) === scope) addOrder(teamAcc.get(o.teamId) ?? teamAcc.get(null)!, o);
  for (const i of invoices) if (!scope || emirateOf(i.emirate) === scope) addInvoice(teamAcc.get(i.teamId) ?? teamAcc.get(null)!, i);
  for (const [teamId, cost] of costT) teamAcc.get(teamId)!.expenses += cost * share(teamId, scope);
  const teams: TeamRow[] = teamIds
    .map((id) => {
      const name = id === null ? "No team" : (teamName.get(id) ?? "Unknown");
      const m = finish(teamAcc.get(id)!);
      return { teamId: id, name, assignedEmirate: isOperational(id) ? name : null, shared: !isOperational(id), ...m };
    })
    .filter((t) => t.teamId !== null || t.orders > 0 || t.invoices > 0 || t.expenses > 0);

  // 5. totals
  const totalsAcc = empty();
  for (const o of orders) if (!scope || emirateOf(o.emirate) === scope) addOrder(totalsAcc, o);
  for (const i of invoices) if (!scope || emirateOf(i.emirate) === scope) addInvoice(totalsAcc, i);
  for (const [teamId, cost] of costT) totalsAcc.expenses += cost * share(teamId, scope);
  const totals = finish(totalsAcc);

  // 6. cost breakdown and monthly trend (costs scaled the same way)
  const bucketTotals = new Map<string, number>(COST_BUCKETS.map((b) => [b, 0]));
  const months = new Map<string, { revenue: number; expenses: number; orders: number }>();
  const touch = (d: Date) => {
    const k = monthKey(d);
    if (!months.has(k)) months.set(k, { revenue: 0, expenses: 0, orders: 0 });
    return months.get(k)!;
  };
  for (let t = Date.UTC(input.from.getUTCFullYear(), input.from.getUTCMonth(), 1); t <= input.to.getTime() && months.size < 36; ) {
    touch(new Date(t));
    const d = new Date(t);
    t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  for (const c of costs) {
    const scaled = c.amount * share(c.teamId, scope);
    bucketTotals.set(c.bucket, (bucketTotals.get(c.bucket) ?? 0) + scaled);
    touch(c.date).expenses += scaled;
  }
  for (const i of invoices) if (!scope || emirateOf(i.emirate) === scope) touch(i.date).revenue += net(i);
  for (const o of orders) if (!scope || emirateOf(o.emirate) === scope) touch(o.date).orders++;
  const monthly = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, label: monthLabel(key), revenue: Math.round(v.revenue), expenses: Math.round(v.expenses), orders: v.orders }));

  const bestOf = <T extends { profit: number; revenue: number }>(rows: T[]) => rows.filter((r) => r.revenue > 0).sort((a, b) => b.profit - a.profit)[0];
  return {
    totals, emirates, teams,
    sharedExpenses: scope ? 0 : round2(shared), unallocatedExpenses: scope ? 0 : round2(unallocated),
    buckets: [...bucketTotals.entries()].map(([label, value]) => ({ label, value: Math.round(value) })).filter((b) => b.value > 0),
    monthly,
    best: { emirate: bestOf(emirates)?.emirate ?? null, team: bestOf(teams.filter((t) => !t.shared))?.name ?? bestOf(teams)?.name ?? null },
  };
}

// The individual records behind a report (for the drill-down lists and the Excel export): the same filters as the figures,
// including the emirate. Costs are listed whole (a cost belongs to a team, not to an emirate).
export function filterRows(input: { orders: OrderRow[]; invoices: InvoiceRow[]; costs: CostRow[] }, f: PerfFilters = {}) {
  const scope = f.emirate && f.emirate !== "all" ? f.emirate : null;
  return {
    orders: input.orders.filter((o) => (!scope || emirateOf(o.emirate) === scope) && (!f.teamId || o.teamId === f.teamId) && (!f.employeeId || o.employeeId === f.employeeId) && (!f.orderStatus || f.orderStatus === "all" || o.status === f.orderStatus)),
    invoices: input.invoices.filter((i) => (!scope || emirateOf(i.emirate) === scope) && (!f.teamId || i.teamId === f.teamId) && (!f.employeeId || i.employeeId === f.employeeId) && (!f.paymentStatus || paymentStateOf(i) === f.paymentStatus)),
    costs: input.costs.filter((c) => (!f.teamId || c.teamId === f.teamId) && (!f.employeeId || c.employeeId === f.employeeId)),
  };
}
