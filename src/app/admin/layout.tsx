import { requireEmployee } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireEmployee("ADMIN");

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
