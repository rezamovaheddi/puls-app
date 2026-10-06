import { Settings } from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Workspace, members, and preferences" />
      <EmptyState
        icon={Settings}
        title="Coming soon"
        description="This area ships in a later phase."
      />
    </div>
  );
}
