import { prisma } from "@/lib/prisma";
import { buildCrewTeams, isTeamLeader, type CrewTeam } from "@/lib/invoiceCrew";

// The teams an invoice can be made for (Ajman and Al Ain; or just the given one), with their supervisor and technician choices.
// `alsoInclude` are employees who stay pickable although no longer active: the technician an invoice being edited already has.
export async function loadCrewTeams(onlyTeamId?: string | null, alsoInclude: string[] = []): Promise<CrewTeam[]> {
  const teams = await prisma.team.findMany({
    where: onlyTeamId ? { id: onlyTeamId } : { name: { in: ["Ajman", "Al Ain"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (teams.length === 0) return [];
  const employees = await prisma.employee.findMany({
    where: { teamId: { in: teams.map((t) => t.id) }, OR: [{ status: "active" }, { id: { in: alsoInclude } }] },
    select: { id: true, name: true, code: true, jobTitle: true, teamId: true },
  });
  return buildCrewTeams(teams, employees);
}

// Checks the technician picked on an invoice belongs to its team and is active (an invoice that already has this technician may keep them
// even after they leave), and finds the team's supervisor at this moment. `keepTechnicianId` is the invoice's current technician when editing.
export async function resolveCrew(
  teamId: string | null,
  technicianId: string,
  keepTechnicianId?: string | null
): Promise<{ ok: true; technicianId: string; supervisorId: string | null } | { ok: false; error: string }> {
  if (!teamId) return { ok: false, error: "Select the team first." };
  if (!technicianId) return { ok: false, error: "Select the technician." };
  const technician = await prisma.employee.findUnique({ where: { id: technicianId }, select: { id: true, teamId: true, status: true } });
  if (!technician || technician.teamId !== teamId) return { ok: false, error: "The technician must be a member of the invoice's team." };
  if (technician.status !== "active" && technician.id !== keepTechnicianId) return { ok: false, error: "That technician is not active." };
  const leaders = await prisma.employee.findMany({
    where: { teamId, status: "active" },
    select: { id: true, code: true, jobTitle: true },
    orderBy: { code: "asc" },
  });
  const supervisor = leaders.find((e) => isTeamLeader(e.jobTitle));
  return { ok: true, technicianId: technician.id, supervisorId: supervisor?.id ?? null };
}
