"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatDateTimeSlash } from "@/lib/format";
import { allowResendWhatsApp } from "@/app/admin/orders/actions";
import type { WhatsAppMessageType } from "@/lib/orderData";

type AdminWorkflowOrder = {
  id: string;
  acceptedAt: Date | null;
  acceptedWhatsAppSentAt: Date | null;
  departedAt: Date | null;
  etaMinutes: string | null;
  onTheWayWhatsAppSentAt: Date | null;
  arrivedAt: Date | null;
  arrivalGpsLat: number | null;
  arrivalGpsLng: number | null;
  arrivedWhatsAppSentAt: Date | null;
  workStartedAt: Date | null;
  jobNotes: string | null;
  photos: { id: string; kind: string; dataUrl: string }[];
  whatsappLogs: { id: string; messageType: string; sentAt: Date; sentBy: { name: string } }[];
};

function ResendButton({ orderId, messageType }: { orderId: string; messageType: WhatsAppMessageType }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Allow the employee to resend the "${messageType}" WhatsApp message?`)) return;
    startTransition(async () => {
      const res = await allowResendWhatsApp(orderId, messageType);
      if (res.ok) {
        router.refresh();
        showToast("Resend allowed.");
      } else {
        showToast(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <button type="button" disabled={isPending} onClick={handleClick} className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60">
      {isPending ? "..." : "Allow Resend"}
    </button>
  );
}

function Row({
  label,
  timestamp,
  extra,
  resend,
}: {
  label: string;
  timestamp: Date | null;
  extra?: string | null;
  resend?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div>
        <div className="text-sm text-slate-900">{label}</div>
        {extra && <div className="text-xs text-slate-500 mt-0.5">{extra}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-slate-500">{timestamp ? formatDateTimeSlash(timestamp) : "Not yet"}</div>
        {timestamp && resend && <div className="mt-1">{resend}</div>}
      </div>
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
        <Row
          label="Accepted — WhatsApp sent"
          timestamp={order.acceptedWhatsAppSentAt}
          resend={<ResendButton orderId={order.id} messageType="Accepted" />}
        />
        <Row label="Departed" timestamp={order.departedAt} extra={order.etaMinutes ? `ETA: ${order.etaMinutes} minutes` : null} />
        <Row
          label="On The Way — WhatsApp sent"
          timestamp={order.onTheWayWhatsAppSentAt}
          resend={<ResendButton orderId={order.id} messageType="On The Way" />}
        />
        <Row label="Arrived" timestamp={order.arrivedAt} extra={gps ? `GPS: ${gps}` : order.arrivedAt ? "GPS not available" : null} />
        <Row
          label="Arrived — WhatsApp sent"
          timestamp={order.arrivedWhatsAppSentAt}
          resend={<ResendButton orderId={order.id} messageType="Arrived" />}
        />
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

      {order.whatsappLogs.length > 0 && (
        <>
          <h4 className="text-xs font-medium text-slate-500 mt-4 mb-1.5">WhatsApp Log</h4>
          <div className="flex flex-col gap-1">
            {order.whatsappLogs.map((log) => (
              <div key={log.id} className="text-xs text-slate-500 flex justify-between">
                <span>
                  {log.messageType} · {log.sentBy.name}
                </span>
                <span>{formatDateTimeSlash(log.sentAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
