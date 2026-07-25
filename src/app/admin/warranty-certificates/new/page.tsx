import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WarrantyCertificateForm } from "@/app/employee/warranty-certificate/WarrantyCertificateForm";

export default async function AdminNewWarrantyCertificatePage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Warranty Certificates" />
      <div className="max-w-2xl">
        <WarrantyCertificateForm detailPathPrefix="/admin/warranty-certificates" />
      </div>
    </div>
  );
}
