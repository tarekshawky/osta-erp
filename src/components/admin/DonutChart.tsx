import { CHART_COLORS } from "./MonthlyBarChart";

const PALETTE = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.purple, CHART_COLORS.pink, CHART_COLORS.teal, "#3D4B66"];

// The donut used for "share" breakdowns (status, team, source, method) -- same card style as the bar chart.
export function DonutChart({ title, slices, unit = "" }: { title: string; slices: { label: string; value: number }[]; unit?: string }) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((a, b) => a + b.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  // where each slice starts along the circle
  const starts = data.map((_, i) => data.slice(0, i).reduce((a, b) => a + (b.value / total) * C, 0));
  const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <svg width="140" height="140" viewBox="0 0 120 120" role="img" aria-label={title} className="shrink-0">
            <g transform="rotate(-90 60 60)">
              {data.map((s, i) => {
                const len = (s.value / total) * C;
                return (
                  <circle key={s.label} cx="60" cy="60" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-starts[i]}>
                    <title>{`${s.label}: ${s.value}`}</title>
                  </circle>
                );
              })}
            </g>
            <text x="60" y="58" textAnchor="middle" className="fill-slate-900" fontSize="15" fontWeight="700">{fmt.format(total)}</text>
            <text x="60" y="73" textAnchor="middle" className="fill-slate-500" fontSize="8">{unit || "total"}</text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {data.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
                <span className="font-medium text-slate-900">{s.value / total < 0.005 ? "<1" : Math.round((s.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
