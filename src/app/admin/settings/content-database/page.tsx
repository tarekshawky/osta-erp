import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { contentStatusNow, type ContentStatus } from "@/lib/contentCopy";
import { ContentDatabasePanel } from "./ContentDatabasePanel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ContentDatabasePage() {
  const s = await getSession();
  if (!s || s.role !== "SUPER_ADMIN") redirect("/admin");
  let status: ContentStatus | null = null;
  try {
    status = await contentStatusNow();
  } catch {
    status = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Settings · Content database" />
      <div className="max-w-3xl px-4 py-6 sm:px-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Content database</h2>
        <p className="mb-5 text-sm text-slate-500">The media library (images) and the audit log can live in a second database, so they never use up the main database&apos;s allowance. The main database keeps everything else.</p>
        {status ? <ContentDatabasePanel status={status} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The databases could not be read just now. Try again in a moment.</p>}
      </div>
    </div>
  );
}
