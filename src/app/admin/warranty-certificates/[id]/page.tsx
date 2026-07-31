import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WarrantyCertificatePreview } from "@/components/warranty/WarrantyCertificatePreview";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";
import { DeleteWarrantyCertificateButton } from "@/components/warranty/DeleteWarrantyCertificateButton";

export default async function AdminWarrantyCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await prisma.warrantyCertificate.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!certificate) notFound();

  return (
    <div className="pb-10">
      <AdminTopBar title="Warranty Certificates" />
      <div className="px-3 sm:px-6 py-6 max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{certificate.customerName}</div>
            <div className="text-sm text-slate-500">{certificate.serviceProvided}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/warranty-certificates/${certificate.id}/edit`}
              className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium py-2.5 px-4 flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
              </svg>
              Edit
            </a>
            <DeleteWarrantyCertificateButton
              certificateId={certificate.id}
              className="rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium py-2.5 px-4 flex items-center gap-1.5"
            />
          </div>
        </div>

        <div id="warranty-certificate-preview">
          <WarrantyCertificatePreview
            data={{
              date: certificate.date,
              customerName: certificate.customerName,
              emirate: certificate.emirate,
              phone: certificate.phone,
              address: certificate.address,
              serviceProvided: certificate.serviceProvided,
              equipmentLocation: certificate.equipmentLocation,
              warrantyFrom: certificate.warrantyFrom,
              warrantyTo: certificate.warrantyTo,
              teamName: certificate.team?.name ?? null,
              teamSupervisor: certificate.teamSupervisor,
            }}
          />
        </div>
        <DownloadPdfButton
          targetId="warranty-certificate-preview"
          fileName={`Warranty-${certificate.customerName.replace(/\s+/g, "-")}`}
          label="Download PDF"
          className="w-full rounded-xl bg-blue-700 text-white text-sm font-medium py-3 text-center"
        />
      </div>
    </div>
  );
}
