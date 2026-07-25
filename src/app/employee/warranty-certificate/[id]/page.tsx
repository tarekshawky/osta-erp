import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { WarrantyCertificatePreview } from "@/components/warranty/WarrantyCertificatePreview";
import { DownloadPdfButton } from "@/components/invoice/DownloadPdfButton";

export default async function WarrantyCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await requireEmployee("EMPLOYEE");
  const certificate = await prisma.warrantyCertificate.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!certificate || certificate.createdById !== employee.id) notFound();

  return (
    <div className="pb-8">
      <TopBar title="Warranty Certificate" />
      <div className="px-5 py-4 flex flex-col gap-4">
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
