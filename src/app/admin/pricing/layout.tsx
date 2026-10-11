import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PricingTabs } from "@/components/pricing/PricingTabs";

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  await requireEmployee("ADMIN");
  return (
    <div className="pb-10">
      <AdminTopBar title="Dynamic Pricing" />
      <div className="px-6 py-6">
        <PricingTabs />
        {children}
      </div>
    </div>
  );
}
