"use server";

import { prisma } from "@/lib/prisma";
import { verifyPin, hashPin, createSession } from "@/lib/session";

export async function loginAdmin(pin: string): Promise<{ ok: boolean }> {
  const admins = await prisma.employee.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  let match = admins.find((e) => verifyPin(pin, e.pinHash));
  // First start of an EMPTY alternate database (emergency mode): with no employee at all, the PIN typed here becomes the first admin's PIN, once.
  // It never applies to the original database, nor to any database that already has an employee.
  if (!match && admins.length === 0 && /^\d{4}$/.test(pin) && (process.env.EMERGENCY_DATABASE_URL || process.env.EMERGENCY_POSTGRES_URL) && (await prisma.employee.count()) === 0) {
    match = await prisma.employee.create({ data: { code: "ADM-001", name: "Admin", jobTitle: "Owner", role: "SUPER_ADMIN", pinHash: hashPin(pin) } });
  }
  if (!match) return { ok: false };
  await createSession({ employeeId: match.id, role: match.role });
  return { ok: true };
}
