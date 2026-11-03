import { getInsight, type InsightKind } from "@/lib/pageInsights";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { DonutChart } from "./DonutChart";

// The chart band shown at the top of an admin page (same look on every page). A failure to read the chart data never
// breaks the page: the band just isn't shown.
export async function PageInsight({ kind }: { kind: InsightKind }) {
  const insight = await getInsight(kind).catch(() => null);
  if (!insight) return null;
  const cards = [
    insight.bars && <MonthlyBarChart key="b1" {...insight.bars} />,
    insight.bars2 && <MonthlyBarChart key="b2" {...insight.bars2} />,
    insight.donut && <DonutChart key="d" {...insight.donut} />,
  ].filter(Boolean);
  if (cards.length === 0) return null;
  return <div className={`grid gap-4 px-6 pt-6 ${cards.length > 1 ? "lg:grid-cols-2" : ""}`}>{cards}</div>;
}
