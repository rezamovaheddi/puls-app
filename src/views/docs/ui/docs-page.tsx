import { FileText } from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Docs" description="Guides and API reference for the Pulse platform" />
      <EmptyState
        icon={FileText}
        title="Coming soon"
        description="This area ships in a later phase."
      />
    </div>
  );
}
