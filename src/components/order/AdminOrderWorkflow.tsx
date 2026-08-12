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
  doneAt: Date | null;
  doneBy: { name: string } | null;
  cancelledAt: Date | null;
  cancelledBy: { name: string } | null;
  cancellationReason: string | null;
  rescheduledAt: Date | null;
  rescheduledBy: { name: string } | null;
  rescheduleReason: string | null;
  statusChanges: {
    id: string;
    previousStatus: string;
    newStatus: string;
    reason: string | null;
    previousScheduledAt: Date | null;
    newScheduledAt: Date | null;
    changedBy: { name: string };
    createdAt: Date;
  }[];
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

      {order.doneAt && (
        <div className="mt-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <span className="font-medium">Marked Done</span>
          {order.doneBy && <> by {order.doneBy.name}</>} · {formatDateTimeSlash(order.doneAt)}
        </div>
      )}

      {order.cancelledAt && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <div>
            <span className="font-medium">Order Cancelled</span>
            {order.cancelledBy && <> · Cancelled By: {order.cancelledBy.name}</>} · {formatDateTimeSlash(order.cancelledAt)}
          </div>
          {order.cancellationReason && <div className="mt-1 text-red-600">Reason: {order.cancellationReason}</div>}
        </div>
      )}

      {order.rescheduledAt && (
        <div className="mt-4 rounded-lg bg-indigo-50 px-3 py-2.5 text-sm text-indigo-700">
          <div>
            <span className="font-medium">Order Rescheduled</span>
            {order.rescheduledBy && <> · By: {order.rescheduledBy.name}</>} · {formatDateTimeSlash(order.rescheduledAt)}
          </div>
          {order.rescheduleReason && <div className="mt-1 text-indigo-600">Reason: {order.rescheduleReason}</div>}
        </div>
      )}

      {order.statusChanges.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-slate-500 mb-1.5">Status History</h4>
          <div className="flex flex-col gap-2">
            {order.statusChanges.map((change) => (
              <div key={change.id} className="text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                <div>
                  <span className="font-medium text-slate-900">
                    {change.previousStatus} → {change.newStatus}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    · {change.changedBy.name} · {formatDateTimeSlash(change.createdAt)}
                  </span>
                </div>
                {change.reason && <div className="text-xs text-slate-500 mt-0.5">Reason: {change.reason}</div>}
                {change.previousScheduledAt && change.newScheduledAt && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Original: {formatDateTimeSlash(change.previousScheduledAt)} → New: {formatDateTimeSlash(change.newScheduledAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
