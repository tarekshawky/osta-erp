import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OstaLogo } from "@/components/OstaLogo";

export default async function RoleSelectPage() {
  const session = await getSession();
  if (session?.role === "EMPLOYEE") redirect("/employee");
  if (session?.role === "ADMIN") redirect("/admin");

  return (
    <div className="min-h-dvh flex flex-col items-center bg-white px-6 pt-20">
      <OstaLogo />

      <h1 className="mt-10 text-3xl font-bold text-slate-900">Welcome</h1>
      <p className="mt-1 text-slate-500">Please select your role to continue</p>

      <div className="mt-8 w-full max-w-sm flex flex-col gap-4">
        <Link
          href="/login/employee"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-left">
            <span className="block font-bold text-slate-900">Employee</span>
            <span className="block text-sm text-slate-500">Login with your PIN</span>
          </span>
        </Link>

        <Link
          href="/login/admin"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-left">
            <span className="block font-bold text-slate-900">Admin</span>
            <span className="block text-sm text-slate-500">Full access control</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
