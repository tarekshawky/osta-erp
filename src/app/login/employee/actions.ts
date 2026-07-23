"use server";

import { prisma } from "@/lib/prisma";
import { verifyPin, createSession } from "@/lib/session";

export async function loginEmployee(pin: string): Promise<{ ok: boolean }> {
  const employees = await prisma.employee.findMany({ where: { role: "EMPLOYEE" } });
  const match = employees.find((e) => verifyPin(pin, e.pinHash));
  if (!match) return { ok: false };
  await createSession({ employeeId: match.id, role: "EMPLOYEE" });
  return { ok: true };
}
