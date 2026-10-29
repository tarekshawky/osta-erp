import { redirect } from "next/navigation";
import { guardPermission } from "@/lib/adminGuard";
import type { Actor } from "./service";

// Pages: signed-out users go to login (requireEmployee), admins without the Jobs permission go back to the dashboard.
// Employee-PIN users never pass requireEmployee("ADMIN").
export async function requireJobsPage(): Promise<Actor> {
  const g = await guardPermission("jobs.manage");
  if (!g.ok) redirect("/admin");
  return { id: g.admin.id, name: g.admin.name };
}

// Server actions: the same check, returned as a result instead of a redirect.
export async function jobsActor(): Promise<{ ok: true; actor: Actor } | { ok: false; error: string }> {
  const g = await guardPermission("jobs.manage");
  if (!g.ok) return { ok: false, error: g.error };
  return { ok: true, actor: { id: g.admin.id, name: g.admin.name } };
}
