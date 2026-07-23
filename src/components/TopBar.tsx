function currentMonthLabel() {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
}

export function TopBar({ title = "OSTA Services" }: { title?: string }) {
  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600">
          {currentMonthLabel()}
        </span>
        <span className="relative text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" strokeLinejoin="round" />
            <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
        </span>
      </div>
    </header>
  );
}
