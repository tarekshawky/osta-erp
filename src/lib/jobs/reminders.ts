import { prisma } from "@/lib/prisma";
import { createJobNotification } from "./service";
import { expectedEnd } from "./status";
import { formatDubaiDate } from "./dates";

const label = (j: { titleEn: string | null; titleAr: string | null; number: number }) => j.titleEn || j.titleAr || `Job #${j.number}`;

// Reminders for the admin's bell. The dedupe key makes every reminder happen once: running this twice creates nothing new.
// The expected end date only asks "confirm completion?": the job is never completed automatically.
export async function runJobReminders(now = new Date()) {
  const created = { deadlineSoon: 0, startSoon: 0, expectedEnd: 0 };
  const day = 86_400_000;

  const deadlines = await prisma.job.findMany({ where: { status: "PUBLISHED", applicationDeadline: { gt: now, lte: new Date(now.getTime() + day) } }, select: { id: true, titleEn: true, titleAr: true, number: true, applicationDeadline: true } });
  for (const j of deadlines) if (await createJobNotification({ type: "deadline_soon", jobId: j.id, message: `Applications for “${label(j)}” close within 24 hours (${formatDubaiDate(j.applicationDeadline!, "en", true)}).`, dedupeKey: `deadline_soon:${j.id}` })) created.deadlineSoon++;

  const starts = await prisma.job.findMany({ where: { status: { in: ["PUBLISHED", "APPLICATIONS_CLOSED", "IN_PROGRESS"] }, startDate: { gt: now, lte: new Date(now.getTime() + day + 4 * 3_600_000) } }, select: { id: true, titleEn: true, titleAr: true, number: true, startDate: true } });
  for (const j of starts) if (await createJobNotification({ type: "start_soon", jobId: j.id, message: `“${label(j)}” starts tomorrow (${formatDubaiDate(j.startDate!, "en")}).`, dedupeKey: `start_soon:${j.id}` })) created.startSoon++;

  const running = await prisma.job.findMany({ where: { type: "DAILY", status: { in: ["IN_PROGRESS", "APPLICATIONS_CLOSED", "PUBLISHED"] }, startDate: { not: null }, workingDays: { not: null } }, select: { id: true, titleEn: true, titleAr: true, number: true, startDate: true, workingDays: true } });
  for (const j of running) {
    const end = expectedEnd(j.startDate, j.workingDays);
    if (end && end.getTime() <= now.getTime() && (await createJobNotification({ type: "expected_end", jobId: j.id, message: `The expected end date of “${label(j)}” has been reached. Confirm completion if the work is finished.`, dedupeKey: `expected_end:${j.id}` }))) created.expectedEnd++;
  }
  return created;
}
