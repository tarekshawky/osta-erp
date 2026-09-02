import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { WorkReportForm } from "../WorkReportForm";

export default async function NewWorkReportPage() {
  await requireEmployee("EMPLOYEE");

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "تقرير جديد", en: "New Report" }} />
      <WorkReportForm redirectTo="/employee/report" />
    </div>
  );
}
