import { STATUS_TRANSITIONS, type JobStatusKey } from "./constants";

export const canTransition = (from: JobStatusKey, to: JobStatusKey) => STATUS_TRANSITIONS[from].includes(to);

export type PublicJobState = "hidden" | "open" | "closed" | "completed" | "cancelled";

// What a visitor sees for a job. A deadline that passed only closes applications; it never completes the job.
export function publicState(job: { status: JobStatusKey; applicationDeadline: Date | null }, now = new Date()): PublicJobState {
  switch (job.status) {
    case "DRAFT": return "hidden";
    case "COMPLETED": return "completed";
    case "CANCELLED": return "cancelled";
    case "APPLICATIONS_CLOSED":
    case "IN_PROGRESS": return "closed";
    case "PUBLISHED": return job.applicationDeadline && job.applicationDeadline.getTime() <= now.getTime() ? "closed" : "open";
  }
}

// Listed on /jobs and accepting applications.
export const isOpenForApplications = (job: { status: JobStatusKey; applicationDeadline: Date | null }, now = new Date()) => publicState(job, now) === "open";

// The expected last working day: start date + number of working days. Only used for a reminder, never to auto-complete.
export function expectedEnd(startDate: Date | null, workingDays: number | null): Date | null {
  if (!startDate || !workingDays || workingDays < 1) return null;
  return new Date(startDate.getTime() + (workingDays - 1) * 86_400_000);
}

// True when enough people were accepted: the admin is offered a one-click close, never closed automatically.
export const requiredWorkersReached = (accepted: number, required: number) => required > 0 && accepted >= required;
