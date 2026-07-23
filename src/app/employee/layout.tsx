import { requireEmployee } from "@/lib/auth";
import { EmployeeBottomNav } from "@/components/EmployeeBottomNav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await requireEmployee("EMPLOYEE");

  return (
    <div className="min-h-dvh bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-slate-50 min-h-dvh flex flex-col shadow-sm">
        <div className="flex-1">{children}</div>
        <EmployeeBottomNav />
      </div>
    </div>
  );
}
