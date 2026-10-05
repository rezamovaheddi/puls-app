import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="Delivery metrics across the workspace" />
      <EmptyState
        icon={TrendingUp}
        title="Coming soon"
        description="This area ships in a later phase."
      />
    </div>
  );
}
