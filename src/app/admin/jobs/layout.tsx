import Link from "next/link";
import { requireJobsPage } from "@/lib/jobs/guard";

// Every page of the module is behind the Jobs permission (checked here on the server, and again in each action and API route).
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  await requireJobsPage();
  return (
    <div>
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm" aria-label="Jobs & Workforce">
        {[["/admin/jobs", "Overview"], ["/admin/jobs/list", "All Jobs"], ["/admin/jobs/new", "+ New Job"], ["/admin/jobs/applications", "Applications"], ["/admin/jobs/workers", "Workers"], ["/admin/jobs/reports", "Reports"], ["/admin/jobs/settings", "Settings"]].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200">{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
