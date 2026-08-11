import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CustomerForm } from "@/components/customer/CustomerForm";

export default async function AdminNewCustomerPage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Customers" />
      <div className="px-6 py-6 max-w-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-5">Create New Customer</h2>
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
