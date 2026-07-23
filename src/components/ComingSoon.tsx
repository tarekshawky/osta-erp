import Link from "next/link";
import { TopBar } from "./TopBar";

export function ComingSoon({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div>
      <TopBar title={title} />
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-bold text-slate-900">Coming soon</h2>
        <p className="text-sm text-slate-500 mt-1">This feature is on the roadmap.</p>
        <Link href={backHref} className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700">
          Back home
        </Link>
      </div>
    </div>
  );
}
