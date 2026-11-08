import { describe, it, expect } from "vitest";
import { ADMIN_NEXT, adminNextFor, orderedStatuses, QUOTE_STATUSES, adminCanRevise, canConvert, customerCanEdit, customerCanSubmit, displayStatus, STATUS_AR, STATUS_TONE } from "./status";

const past = new Date(Date.now() - 864e5), future = new Date(Date.now() + 864e5 * 10);

describe("quotation status", () => {
  it("has the statuses of both calculators, each with Arabic text and a colour", () => {
    expect([...QUOTE_STATUSES]).toEqual(["Draft", "Generated", "Submitted", "Under Review", "Site Inspection Required", "Revised", "Sent", "Accepted", "Rejected", "Expired", "Converted to Order", "Under Technical Review", "Converted to Project"]);
    expect(orderedStatuses("ductwork")).toEqual(["Draft", "Generated", "Submitted", "Under Technical Review", "Site Inspection Required", "Revised", "Sent", "Accepted", "Rejected", "Expired", "Converted to Project"]);
    expect(orderedStatuses("ac-install")).toHaveLength(11);
    for (const s of QUOTE_STATUSES) { expect(STATUS_AR[s], s).toBeTruthy(); expect(STATUS_TONE[s], s).toBeTruthy(); expect(ADMIN_NEXT[s], s).toBeDefined(); }
  });
  it("an unanswered quotation expires when its validity passes; an accepted, rejected or converted one never does", () => {
    for (const s of ["Generated", "Submitted", "Sent", "Under Review"]) expect(displayStatus({ status: s, expiresAt: past }), s).toBe("Expired");
    expect(displayStatus({ status: "Generated", expiresAt: future })).toBe("Generated");
    for (const s of ["Accepted", "Rejected", "Converted to Order"]) expect(displayStatus({ status: s, expiresAt: past }), s).toBe(s);
  });
  it("the ductwork calculator has its own review and end statuses, and only an accepted one can become a project", () => {
    expect(adminNextFor("ductwork", "Generated")).toEqual(["Under Technical Review", "Site Inspection Required", "Sent", "Accepted", "Rejected"]);
    expect(adminNextFor("ac-install", "Generated")).toContain("Under Review"); expect(adminNextFor("ductwork", "Under Technical Review")).toEqual(["Site Inspection Required", "Sent", "Accepted", "Rejected"]);
    expect(adminNextFor("ductwork", "Converted to Project")).toEqual([]); expect(adminCanRevise("Converted to Project")).toBe(false);
    expect(displayStatus({ status: "Converted to Project", expiresAt: past })).toBe("Converted to Project"); expect(displayStatus({ status: "Under Technical Review", expiresAt: past })).toBe("Expired");
  });
  it("only an accepted quotation can become an order, and nothing moves out of Converted", () => {
    expect(canConvert("Accepted")).toBe(true);
    for (const s of QUOTE_STATUSES.filter((x) => x !== "Accepted")) expect(canConvert(s), s).toBe(false);
    expect(ADMIN_NEXT["Converted to Order"]).toEqual([]); expect(adminCanRevise("Converted to Order")).toBe(false); expect(adminCanRevise("Sent")).toBe(true);
    for (const s of QUOTE_STATUSES) expect(ADMIN_NEXT[s].includes("Converted to Order"), s).toBe(false); // only the convert action does that
  });
  it("the customer can edit while the quotation is open and until the administration has taken it over; never after a decision or a manual revision", () => {
    for (const s of ["Generated", "Submitted", "Sent", "Expired"] as const) expect(customerCanEdit(s, false), s).toBe(true);
    for (const s of ["Under Review", "Site Inspection Required", "Accepted", "Rejected", "Converted to Order"] as const) expect(customerCanEdit(s, false), s).toBe(false);
    expect(customerCanEdit("Generated", true)).toBe(false);
    expect(customerCanSubmit("Generated")).toBe(true); expect(customerCanSubmit("Sent")).toBe(true); expect(customerCanSubmit("Accepted")).toBe(false); expect(customerCanSubmit("Expired")).toBe(false);
  });
});
