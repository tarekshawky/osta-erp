// How an order's status shows in the calendar. The calendar never stores this: it is read from the order every time, so the colour is always
// current whichever screen (admin, employee) changed the order.

export type CalStatus = "Pending" | "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Conflict" | "Blocked";

export function calendarStatus(e: { kind: string; state: string; override: boolean; order?: { status: string } | null }): CalStatus {
  if (e.kind === "BLOCK") return "Blocked";
  if (e.state === "CANCELLED" || e.order?.status === "Cancelled") return "Cancelled";
  if (e.override) return "Conflict";
  const s = e.order?.status ?? "";
  if (s === "Done") return "Completed";
  if (s === "On The Way" || s === "Arrived" || s === "In Progress") return "In Progress";
  if (s === "Assigned" || s === "Accepted") return "Confirmed";
  return "Pending"; // Requested, Reschedule, or no order yet
}

export const STATUS_STYLE: Record<CalStatus, { bg: string; border: string; text: string; dot: string }> = {
  Confirmed: { bg: "#dcfce7", border: "#16a34a", text: "#14532d", dot: "#16a34a" },
  "In Progress": { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a", dot: "#2563eb" },
  Pending: { bg: "#ffedd5", border: "#ea580c", text: "#7c2d12", dot: "#ea580c" },
  Completed: { bg: "#ccfbf1", border: "#0d9488", text: "#134e4a", dot: "#0d9488" },
  Cancelled: { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d", dot: "#dc2626" },
  Conflict: { bg: "#fecaca", border: "#b91c1c", text: "#7f1d1d", dot: "#b91c1c" },
  Blocked: { bg: "#e2e8f0", border: "#64748b", text: "#334155", dot: "#64748b" },
};
