import { LoadingPanel } from "@/components/admin/LoadingPanel";

// What a website screen looks like while it loads: the Control Center header and dock stay, and the spinner shows only where
// the content will appear.
export function WebsiteLoading() {
  return (
    <div className="px-6 py-6">
      <LoadingPanel compact />
    </div>
  );
}
