import { JobsBell } from "@/components/jobs/JobsBell";
import { DateFilter } from "./DateFilter";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderUser } from "./HeaderUser";

function currentMonthLabel() {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());
}

// The white header of every admin page (as in the design): page name, search, month filter, bell and the signed-in user.
export function AdminTopBar({
  title,
  dateFilter,
  hideMonth = false,
}: {
  title: string;
  dateFilter?: { years: number[]; selectedYear: number | "all"; selectedMonth: number | "all"; basePath: string };
  hideMonth?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#DCE5F7] bg-white px-4 py-3 sm:px-6">
      <h1 className="order-1 mr-auto min-w-0 truncate text-base font-semibold text-[#0B1F4D] sm:text-lg">{title}</h1>
      {/* On a phone: title + bell + user on the first row, search below, then the month filter. */}
      <div className="order-2 flex items-center gap-3 sm:order-5">
        <span className="text-[#0B2A6B]">
          <JobsBell>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" strokeLinejoin="round" />
              <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
            </svg>
          </JobsBell>
        </span>
        <HeaderUser />
      </div>
      <div className="order-3 w-full sm:w-72 lg:w-80">
        <HeaderSearch />
      </div>
      {dateFilter ? (
        <div className="order-4">
          <DateFilter years={dateFilter.years} selectedYear={dateFilter.selectedYear} selectedMonth={dateFilter.selectedMonth} basePath={dateFilter.basePath} />
        </div>
      ) : !hideMonth ? (
        <span className="order-4 hidden whitespace-nowrap rounded-full bg-[#EEF3FC] px-3 py-1.5 text-xs text-[#0B1F4D] sm:inline sm:text-sm">{currentMonthLabel()}</span>
      ) : null}
    </header>
  );
}
