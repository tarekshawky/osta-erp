// The same bar chart on every admin page that shows a monthly trend (design spec: blue bars, rounded top, soft card).
export const CHART_COLORS = { blue: "#1E5BD8", green: "#138A4C", orange: "#C2560C", purple: "#7B3FE4", pink: "#C2185B", teal: "#0E7C8C" } as const;
const COLORS = CHART_COLORS;

export function MonthlyBarChart({
  title,
  points,
  tone = "blue",
  unit = "AED",
  subtitle = "Last 6 months",
}: {
  title: string;
  points: { label: string; value: number }[];
  tone?: keyof typeof COLORS;
  unit?: string;
  subtitle?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const empty = points.every((p) => p.value === 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{subtitle}{unit ? ` · ${unit}` : ""}</span>
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="mt-4 flex h-44 items-end gap-2" role="img" aria-label={title}>
          {points.map((p) => (
            <div key={p.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">{p.value ? fmt.format(p.value) : ""}</span>
              <div className="w-full max-w-10 rounded-t-md" style={{ height: `${Math.max(p.value ? 4 : 0, (p.value / max) * 100)}%`, background: COLORS[tone], opacity: 0.92 }} title={`${p.label}: ${p.value}`} />
              <span className="text-[11px] text-slate-500">{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
