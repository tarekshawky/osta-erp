import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { VehicleDocumentRow } from "@/lib/vehicleData";

function DocLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          View
        </a>
      ) : (
        <Link href="/admin/vehicles" className="text-sm text-slate-400 hover:text-blue-600">
          Not uploaded — add via Edit Vehicle
        </Link>
      )}
    </div>
  );
}

export function VehicleDocumentsPanel({
  registrationDocUrl,
  insuranceDocUrl,
  byType,
}: {
  registrationDocUrl: string | null;
  insuranceDocUrl: string | null;
  byType: Record<string, VehicleDocumentRow[]>;
}) {
  const typeEntries = Object.entries(byType);
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DocLink label="Registration Document" url={registrationDocUrl} />
        <DocLink label="Insurance Document" url={insuranceDocUrl} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {typeEntries.map(([type, docs]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {type} Documents <span className="text-slate-400 font-normal">({docs.length})</span>
            </h3>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-900">{doc.description}</div>
                    <div className="text-xs text-slate-400">{formatDate(doc.date)}</div>
                  </div>
                  <a href={doc.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
        {typeEntries.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">No expense receipts or invoices attached yet.</p>
        )}
      </div>
    </div>
  );
}
