import { describe, expect, it } from "vitest";
import { buildCrewTeams, crewDisplayOf, isTeamLeader, teamLabel } from "./invoiceCrew";

const emp = (id: string, code: string, jobTitle: string, teamId: string | null, name = id) => ({ id, name, code, jobTitle, teamId });

describe("invoice crew", () => {
  it("makes the team's Team Leader the supervisor and lets any active member be the technician", () => {
    const teams = [{ id: "aj", name: "Ajman" }, { id: "ai", name: "Al Ain" }];
    const crew = buildCrewTeams(teams, [
      emp("m", "MGR-AJM-001", "HVAC Manager", "aj"),
      emp("l", "TL-AJM-001", "Team Leader", "aj", "Mostafa"),
      emp("t", "TEC-AJM-009", "Technician", "aj"),
      emp("o", "TL-AIN-001", "Team Leader", "ai", "Abdallah"),
      emp("x", "ADM-001", "CEO", null),
    ]);
    expect(crew[0].supervisor).toEqual({ id: "l", name: "Mostafa", code: "TL-AJM-001" });
    expect(crew[0].technicians.map((t) => t.id)).toEqual(["m", "t", "l"]); // sorted by code, the leader included; nobody from another team
    expect(crew[1].supervisor?.name).toBe("Abdallah");
    expect(crew[1].technicians.map((t) => t.id)).toEqual(["o"]);
  });

  it("has no supervisor when the team has no Team Leader", () => {
    expect(buildCrewTeams([{ id: "aj", name: "Ajman" }], [emp("t", "TEC-1", "Technician", "aj")])[0].supervisor).toBeNull();
    expect(isTeamLeader("Senior Team Leader")).toBe(true);
    expect(isTeamLeader("Technician")).toBe(false);
  });

  it("prints the chosen technician and supervisor, and keeps the creator as technician on old invoices", () => {
    const createdBy = { name: "Abdallah", code: "TL-AJM-002" };
    expect(crewDisplayOf({ team: { name: "Al Ain" }, technician: { name: "Sami", code: "TEC-1" }, supervisor: { name: "Abdallah" }, createdBy })).toEqual({
      teamName: "Al Ain Team",
      supervisor: "Abdallah",
      technician: { name: "Sami", code: "TEC-1" },
    });
    expect(crewDisplayOf({ team: { name: "Al Ain" }, technician: null, supervisor: null, createdBy })).toEqual({
      teamName: "Al Ain Team",
      supervisor: null,
      technician: createdBy,
    });
    expect(crewDisplayOf({ team: null, technician: null, supervisor: null, createdBy }).teamName).toBeNull();
    expect(teamLabel("Ajman")).toBe("Ajman Team");
  });
});
