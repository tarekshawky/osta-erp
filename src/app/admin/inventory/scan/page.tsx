import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminScanLookup } from "@/components/inventory/AdminScanLookup";

export default function AdminScanPage() {
  return (
    <div className="pb-10">
      <AdminTopBar title="Scan Item" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Scan Item</h2>
          <p className="text-sm text-slate-500 mt-0.5">Scan a barcode/QR code or type a SKU to quickly look up an item.</p>
        </div>
        <AdminScanLookup />
      </div>
    </div>
  );
}
