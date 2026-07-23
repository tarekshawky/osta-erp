import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const admin = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
