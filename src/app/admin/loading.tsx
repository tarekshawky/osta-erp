import { LoadingPanel } from "@/components/admin/LoadingPanel";

// Shown at once when you open any admin page, while its data is being prepared.
export default function AdminLoading() {
  return <LoadingPanel />;
}
