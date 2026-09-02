import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";
import { TopBar } from "@/components/TopBar";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

const T = {
  ar: {
    employeeCode: "الرقم الوظيفي",
    jobTitle: "المسمى الوظيفي",
    team: "الفريق",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    logout: "تسجيل الخروج",
  },
  en: {
    employeeCode: "Employee Code",
    jobTitle: "Job Title",
    team: "Team",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    logout: "Logout",
  },
} as const;

export default async function EmployeeProfilePage() {
  const session = await requireEmployee("EMPLOYEE");
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.id },
    include: { team: true },
  });

  const rows = [
    { label: s.employeeCode, value: employee.code },
    { label: s.jobTitle, value: employee.jobTitle },
    { label: s.team, value: employee.team?.name ?? "—" },
    { label: s.status, value: employee.status === "active" ? s.active : s.inactive },
  ];

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "حسابي", en: "Profile" }} />

      <div className="px-5 py-8 flex flex-col items-center border-b border-slate-100">
        <ProfilePhotoUpload name={employee.name} initials={initials(employee.name)} photoData={employee.photoData} />
        <div className="mt-3 font-bold text-slate-900">{employee.name}</div>
        <div className="text-sm text-slate-500">{employee.jobTitle}</div>
      </div>

      <div className="px-5 py-4" dir={dir}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className={`text-sm text-slate-500 ${font}`}>{row.label}</span>
            <span className="text-sm font-medium text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="px-5 mt-4">
        <form action={logout}>
          <button
            className={`w-full rounded-xl border border-red-200 text-red-600 font-medium text-sm py-3 hover:bg-red-50 ${font}`}
            dir={dir}
          >
            {s.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
