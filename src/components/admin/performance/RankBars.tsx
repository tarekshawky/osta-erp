// Horizontal bars for comparing emirates or teams. Handles negative values (a loss is drawn to the left in red).
export function RankBars({
  title,
  rows,
  unit = "AED",
  tone = "blue",
}: {
  title: string;
  rows: { label: string; value: number; href?: string }[];
  unit?: string;
  tone?: "blue" | "green" | "orange" | "purple";
}) {
  const colors = { blue: "#1E5BD8", green: "#138A4C", orange: "#C2560C", purple: "#7B3FE4" } as const;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const hasNegative = rows.some((r) => r.value < 0);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: unit === "AED" ? 0 : 0 });
  const visible = rows.filter((r) => r.value !== 0 || rows.length <= 4);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      {visible.length === 0 || visible.every((r) => r.value === 0) ? (
        <p className="py-10 text-center text-sm text-slate-500">No data in this period.</p>
      ) : (
        <ul className="mt-4 space-y-2.5" role="img" aria-label={title}>
          {visible.map((r) => {
            const width = `${Math.max(2, (Math.abs(r.value) / max) * (hasNegative ? 48 : 96))}%`;
            return (
              <li key={r.label} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-slate-600" title={r.label}>{r.label}</span>
                <span className="relative flex h-5 flex-1 items-center">
                  {hasNegative && <span className="absolute left-1/2 top-0 h-5 w-px bg-slate-200" />}
                  <span
                    className="absolute h-4 rounded"
                    style={{ width, background: r.value < 0 ? "#E5383B" : colors[tone], ...(hasNegative ? (r.value < 0 ? { right: "50%" } : { left: "50%" }) : { left: 0 }) }}
                  />
                </span>
                <span className={`w-24 shrink-0 text-right font-medium ${r.value < 0 ? "text-red-600" : "text-slate-900"}`}>{fmt.format(Math.round(r.value))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
