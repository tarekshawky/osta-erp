import type { ReactNode } from "react";

// Thin print-safe shell every report's preview component renders inside -- a stable
// id for DownloadPdfButton's capture target, consistent A4-width styling, and a
// `print:` variant so window.print() doesn't carry over the surrounding page chrome.
export function ReportPreview({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 max-w-3xl mx-auto print:border-0 print:shadow-none print:p-0 print:max-w-none">
      {children}
    </div>
  );
}
