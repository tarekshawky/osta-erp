import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";
import type { Employee } from "@/generated/prisma";

export async function requireEmployee(role: "ADMIN" | "EMPLOYEE"): Promise<Employee> {
  const session = await getSession();
  if (!session || session.role !== role) redirect("/");

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) {
    // The session cookie is signed and looks valid, but the employee it points to no
    // longer exists (e.g. database reseed). Redirecting to "/" would just bounce back
    // here since the root page trusts the cookie's role claim without a DB check, and
    // cookies can't be cleared from a render pass. Send straight to the PIN pad instead;
    // a fresh login overwrites the stale cookie.
    redirect(role === "ADMIN" ? "/login/admin" : "/login/employee");
  }
  return employee;
}
