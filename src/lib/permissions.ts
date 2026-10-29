// Granular admin permissions. Enforced on the server for every mutation (guardPermission),
// never only in the UI. SUPER_ADMIN always passes. An ADMIN with no assigned role keeps
// full access (legacy behaviour) so nobody is locked out by this feature.
export const PERMISSIONS = [
  "pages.create",
  "pages.edit",
  "pages.publish",
  "pages.delete",
  "seo.edit",
  "integrations.manage",
  "company.edit",
  "pricing.edit",
  "discounts.edit",
  "orders.view",
  "orders.manage",
  "visitFee.review",
  "leads.view",
  "media.manage",
  "audit.view",
  "jobs.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_DEFINITIONS: { key: string; name: string; permissions: Permission[] }[] = [
  { key: "OWNER", name: "Owner", permissions: [...PERMISSIONS] },
  {
    key: "ADMIN",
    name: "Admin",
    permissions: PERMISSIONS.filter((p) => p !== "integrations.manage"),
  },
  { key: "EDITOR", name: "Editor", permissions: ["pages.create", "pages.edit", "media.manage"] },
  { key: "SEO", name: "SEO", permissions: ["seo.edit", "pages.edit"] },
  { key: "OPERATIONS", name: "Operations", permissions: ["orders.view", "orders.manage", "visitFee.review", "leads.view"] },
  { key: "VIEWER", name: "Viewer", permissions: ["orders.view", "leads.view"] },
];

export function hasPermission(
  employee: { role: string },
  rolePermissions: string[] | null,
  permission: Permission
): boolean {
  if (employee.role === "SUPER_ADMIN") return true;
  if (employee.role !== "ADMIN") return false;
  if (rolePermissions === null) return true; // no role assigned = unrestricted admin
  return rolePermissions.includes(permission);
}
