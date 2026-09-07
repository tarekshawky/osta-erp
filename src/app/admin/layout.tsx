import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { canAccessAdminSection } from "@/lib/adminSections";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireEmployee("ADMIN");
  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  if (!isSuperAdmin) {
    const pathname = (await headers()).get("x-pathname") ?? "/admin";
    if (!canAccessAdminSection(admin.adminSections, pathname)) {
      // Redirect into the restricted section itself would loop, so only
      // redirect when the blocked page isn't the Dashboard -- if Dashboard
      // itself is restricted, fall through and let AdminShell render an
      // explanatory message instead of `children`.
      if (pathname !== "/admin") redirect("/admin");
      return (
        <AdminShell adminName={admin.name} isSuperAdmin={false} adminSections={admin.adminSections}>
          <div className="p-8 text-center text-sm text-slate-500">
            You don&apos;t have access to any dashboard sections yet. Contact your Super Admin.
          </div>
        </AdminShell>
      );
    }
  }

  return (
    <AdminShell adminName={admin.name} isSuperAdmin={isSuperAdmin} adminSections={admin.adminSections}>
      {children}
    </AdminShell>
  );
}
