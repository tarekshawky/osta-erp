import Link from "next/link";
import { guardPermission } from "@/lib/adminGuard";
import { unreadJobNotifications } from "@/lib/jobs/service";

// The bell in the admin header: unread Jobs notifications (new applications and reminders). Shown only to admins who
// have the Jobs permission; the list is on the Jobs overview page.
export async function JobsBell({ children }: { children: React.ReactNode }) {
  let count = 0;
  try {
    const g = await guardPermission("jobs.manage");
    if (g.ok) count = await unreadJobNotifications();
  } catch {
    count = 0;
  }
  return (
    <Link href="/admin/jobs#notifications" className="relative shrink-0" aria-label={count ? `${count} unread job notifications` : "Job notifications"} title="Jobs notifications">
      {children}
      {count > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
