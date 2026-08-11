import { formatDateTimeSlash } from "@/lib/format";

type AdminWorkflowOrder = {
  acceptedAt: Date | null;
  departedAt: Date | null;
  etaMinutes: string | null;
  arrivedAt: Date | null;
  arrivalGpsLat: number | null;
  arrivalGpsLng: number | null;
  workStartedAt: Date | null;
  jobNotes: string | null;
  photos: { id: string; kind: string; dataUrl: string }[];
};

function Row({ label, timestamp, extra }: { label: string; timestamp: Date | null; extra?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div>
        <div className="text-sm text-slate-900">{label}</div>
        {extra && <div className="text-xs text-slate-500 mt-0.5">{extra}</div>}
      </div>
      <div className="text-xs text-slate-500 shrink-0">{timestamp ? formatDateTimeSlash(timestamp) : "Not yet"}</div>
    </div>
  );
}

export function AdminOrderWorkflow({ order }: { order: AdminWorkflowOrder }) {
  const beforePhotos = order.photos.filter((p) => p.kind === "Before");
  const afterPhotos = order.photos.filter((p) => p.kind === "After");
  const gps =
    order.arrivalGpsLat != null && order.arrivalGpsLng != null
      ? `${order.arrivalGpsLat.toFixed(5)}, ${order.arrivalGpsLng.toFixed(5)}`
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">Workflow</h3>
      <div className="flex flex-col">
        <Row label="Accepted" timestamp={order.acceptedAt} />
        <Row label="Departed" timestamp={order.departedAt} extra={order.etaMinutes ? `ETA: ${order.etaMinutes} minutes` : null} />
        <Row label="Arrived" timestamp={order.arrivedAt} extra={gps ? `GPS: ${gps}` : order.arrivedAt ? "GPS not available" : null} />
        <Row label="Work started" timestamp={order.workStartedAt} />
      </div>

      {order.jobNotes && (
        <>
          <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1">Job Notes</h4>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.jobNotes}</p>
        </>
      )}

      {beforePhotos.length > 0 && (
        <>
          <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1.5">Before Photos</h4>
          <div className="flex flex-wrap gap-2">
            {beforePhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.dataUrl} alt="Before" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
            ))}
          </div>
        </>
      )}

      {afterPhotos.length > 0 && (
        <>
          <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1.5">After Photos</h4>
          <div className="flex flex-wrap gap-2">
            {afterPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.dataUrl} alt="After" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
