import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WarrantyCertificateForm } from "@/app/employee/warranty-certificate/WarrantyCertificateForm";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminWarrantyCertificateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEmployee("ADMIN");
  const certificate = await prisma.warrantyCertificate.findUnique({ where: { id } });
  if (!certificate) notFound();

  return (
    <div className="pb-10">
      <AdminTopBar title="Warranty Certificates" />
      <div className="max-w-2xl">
        <WarrantyCertificateForm
          detailPathPrefix="/admin/warranty-certificates"
          mode="edit"
          certificateId={certificate.id}
          initial={{
            customerName: certificate.customerName,
            emirate: certificate.emirate ?? "",
            phone: certificate.phone ?? "",
            address: certificate.address ?? "",
            serviceProvided: certificate.serviceProvided,
            equipmentLocation: certificate.equipmentLocation ?? "",
            warrantyFrom: toDateInput(certificate.warrantyFrom),
            warrantyTo: toDateInput(certificate.warrantyTo),
            teamSupervisor: certificate.teamSupervisor ?? "",
          }}
        />
      </div>
    </div>
  );
}
