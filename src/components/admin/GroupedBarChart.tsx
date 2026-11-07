// Two bars per label (for example revenue next to expenses per month), in the same card style as the other charts.
export function GroupedBarChart({
  title,
  points,
  series,
}: {
  title: string;
  points: { label: string; a: number; b: number }[];
  series: [{ name: string; color: string }, { name: string; color: string }];
}) {
  const max = Math.max(1, ...points.flatMap((p) => [p.a, p.b]));
  const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const empty = points.every((p) => p.a === 0 && p.b === 0);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-slate-500">No data in this period.</p>
      ) : (
        <div className="mt-4 flex h-44 items-end gap-3 overflow-x-auto" role="img" aria-label={title}>
          {points.map((p) => (
            <div key={p.label} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                {[
                  { v: p.a, c: series[0].color, n: series[0].name },
                  { v: p.b, c: series[1].color, n: series[1].name },
                ].map((bar) => (
                  <div key={bar.n} className="flex h-full w-full max-w-6 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-medium text-slate-500">{bar.v ? fmt.format(bar.v) : ""}</span>
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max(bar.v ? 3 : 0, (bar.v / max) * 82)}%`, background: bar.c }} title={`${bar.n}: ${bar.v}`} />
                  </div>
                ))}
              </div>
              <span className="whitespace-nowrap text-[11px] text-slate-500">{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
