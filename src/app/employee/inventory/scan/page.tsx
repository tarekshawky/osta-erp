import { TopBar } from "@/components/TopBar";
import { EmployeeScanLookup } from "@/components/inventory/EmployeeScanLookup";

export default function EmployeeScanPage() {
  return (
    <div className="pb-8">
      <TopBar title="Scan Item" />
      <div className="px-5 py-4">
        <p className="text-sm text-slate-500 mb-4">Scan a barcode/QR code or type a SKU to quickly look up an item.</p>
        <EmployeeScanLookup />
      </div>
    </div>
  );
}
