import { DateFilter } from "./DateFilter";

function currentMonthLabel() {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
}

export function AdminTopBar({
  title,
  dateFilter,
}: {
  title: string;
  dateFilter?: { years: number[]; selectedYear: number | "all"; selectedMonth: number | "all"; basePath: string };
}) {
  return (
    <header className="bg-gradient-to-r from-blue-950 to-blue-800 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="font-semibold whitespace-nowrap">{title}</h1>
      <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
        {dateFilter ? (
          <DateFilter
            years={dateFilter.years}
            selectedYear={dateFilter.selectedYear}
            selectedMonth={dateFilter.selectedMonth}
            basePath={dateFilter.basePath}
          />
        ) : (
          <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs sm:text-sm whitespace-nowrap">
            {currentMonthLabel()}
          </span>
        )}
        <span className="relative shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" strokeLinejoin="round" />
            <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-400" />
        </span>
      </div>
    </header>
  );
}
