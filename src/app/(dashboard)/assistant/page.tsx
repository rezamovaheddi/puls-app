import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export default function AssistantPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Assistant" description="Your AI copilot for planning and triage" />
      <EmptyState
        icon={Sparkles}
        title="Coming soon"
        description="This area ships in a later phase."
      />
    </div>
  );
}
