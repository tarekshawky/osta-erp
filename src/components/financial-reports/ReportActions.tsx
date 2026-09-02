import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { PrintButton } from "./PrintButton";

const buttonClass =
  "text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2";
const primaryButtonClass =
  "text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2";

export function ReportActions({
  targetId,
  fileName,
  excelHref,
  disableExport,
  disableExportReason,
}: {
  targetId: string;
  fileName: string;
  excelHref?: string;
  disableExport?: boolean;
  disableExportReason?: string;
}) {
  if (disableExport) {
    return (
      <div className="no-print rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
        Export disabled — {disableExportReason ?? "this report is not balanced."}
      </div>
    );
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <DownloadPdfButton targetId={targetId} fileName={fileName} className={primaryButtonClass} label="Export PDF" />
      <PrintButton className={buttonClass} />
      {excelHref && (
        <a href={excelHref} className={buttonClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block align-middle mr-1.5 -mt-0.5">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export Excel
        </a>
      )}
    </div>
  );
}
