"use server";

import { prisma } from "@/lib/prisma";
import { verifyPin, createSession } from "@/lib/session";

export async function loginAdmin(pin: string): Promise<{ ok: boolean }> {
  const admins = await prisma.employee.findMany({ where: { role: "ADMIN" } });
  const match = admins.find((e) => verifyPin(pin, e.pinHash));
  if (!match) return { ok: false };
  await createSession({ employeeId: match.id, role: "ADMIN" });
  return { ok: true };
}
