import { prisma } from "./prisma";
import { requireEmployee } from "./auth";
import { hasPermission, type Permission } from "./permissions";
import type { Employee } from "@/generated/prisma";

export type Guard =
  | { ok: true; admin: Employee; can: (permission: Permission) => boolean }
  | { ok: false; error: string };

// Server-side permission check for admin mutations. Redirects to login when signed out
// (via requireEmployee), otherwise returns a result the action can hand back to the UI.
export async function guardPermission(permission: Permission): Promise<Guard> {
  const admin = await requireEmployee("ADMIN");
  const role = admin.adminRoleId
    ? await prisma.adminRole.findUnique({ where: { id: admin.adminRoleId }, select: { permissions: true } })
    : null;
  const rolePermissions = admin.adminRoleId ? (role?.permissions ?? []) : null;
  const can = (p: Permission) => hasPermission(admin, rolePermissions, p);
  if (!can(permission)) {
    return { ok: false, error: "You don't have permission to do this. Ask the owner to update your role." };
  }
  return { ok: true, admin, can };
}

export async function writeAudit(
  admin: { id: string; name: string },
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown
) {
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorName: admin.name,
      action,
      entity,
      entityId,
      before: before === null || before === undefined ? undefined : (before as object),
      after: after === null || after === undefined ? undefined : (after as object),
    },
  });
}
