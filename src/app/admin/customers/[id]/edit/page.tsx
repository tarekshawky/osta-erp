import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CustomerForm } from "@/components/customer/CustomerForm";
import type { CustomerFormInput } from "@/app/admin/customers/actions";

export default async function AdminEditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const initialCustomer: CustomerFormInput = {
    type: customer.type,
    name: customer.name,
    companyName: customer.companyName ?? "",
    trn: customer.trn ?? "",
    phone: customer.phone,
    whatsapp: customer.whatsapp ?? "",
    email: customer.email ?? "",
    language: customer.language,
    emirate: customer.emirate,
    city: customer.city ?? "",
    area: customer.area ?? "",
    buildingType: customer.buildingType ?? "",
    buildingName: customer.buildingName ?? "",
    flatNo: customer.flatNo ?? "",
    address: customer.address ?? "",
    locationUrl: customer.locationUrl ?? "",
    notes: customer.notes ?? "",
    status: customer.status,
  };

  return (
    <div className="pb-10">
      <AdminTopBar title="Customers" />
      <div className="px-6 py-6 max-w-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-5">Edit Customer</h2>
        <CustomerForm mode="edit" editCustomerId={id} initialCustomer={initialCustomer} />
      </div>
    </div>
  );
}
