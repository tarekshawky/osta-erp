const STYLES: Record<string, string> = {
  Ajman: "bg-blue-50 text-blue-600",
  "Al Ain": "bg-purple-50 text-purple-600",
  Admin: "bg-slate-100 text-slate-600",
};

export function TeamBadge({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[name] ?? "bg-slate-100 text-slate-600"}`}>
      {name}
    </span>
  );
}
