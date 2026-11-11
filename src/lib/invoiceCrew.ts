// The team behind an invoice: its team, the supervisor (the team's Team Leader) and the technician who did the work. Pure (no database).

export type CrewMember = { id: string; name: string; code: string };
export type CrewTeam = { id: string; name: string; supervisor: CrewMember | null; technicians: CrewMember[] };

export const isTeamLeader = (jobTitle: string) => /team\s*leader/i.test(jobTitle);

export const teamLabel = (name: string) => `${name} Team`;

type EmployeeRow = { id: string; name: string; code: string; jobTitle: string; teamId: string | null };

// Per team: its supervisor is the first active Team Leader (by code), and anyone active in the team can be picked as the technician.
export function buildCrewTeams(teams: { id: string; name: string }[], activeEmployees: EmployeeRow[]): CrewTeam[] {
  return teams.map((team) => {
    const members = activeEmployees.filter((e) => e.teamId === team.id).sort((a, b) => a.code.localeCompare(b.code));
    const leader = members.find((m) => isTeamLeader(m.jobTitle));
    return {
      id: team.id,
      name: team.name,
      supervisor: leader ? { id: leader.id, name: leader.name, code: leader.code } : null,
      technicians: members.map((m) => ({ id: m.id, name: m.name, code: m.code })),
    };
  });
}

// What an invoice prints under its Team heading.
export type CrewDisplay = { teamName: string | null; supervisor: string | null; technician: { name: string; code: string } | null };

type InvoiceCrewRecord = {
  team: { name: string } | null;
  technician: { name: string; code: string } | null;
  supervisor: { name: string } | null;
  createdBy: { name: string; code: string };
};

// An invoice made before the technician was chosen printed its creator as the "technician"; it keeps doing so, with no supervisor.
export function crewDisplayOf(invoice: InvoiceCrewRecord): CrewDisplay {
  const teamName = invoice.team ? teamLabel(invoice.team.name) : null;
  if (invoice.technician) return { teamName, supervisor: invoice.supervisor?.name ?? null, technician: invoice.technician };
  return { teamName, supervisor: null, technician: { name: invoice.createdBy.name, code: invoice.createdBy.code } };
}
