import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export default function DocsPage() {
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
