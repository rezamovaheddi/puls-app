import { ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
import { ISSUES, IssueRow } from "@/entities/issue";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select, SelectTrigger, SelectValue } from "@/shared/ui/select";

const TOTAL_ISSUES = 128;

export async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Issues" description="Everything assigned, filed, and in flight" />

      {demo === "empty" ? (
        <EmptyState
          icon={SearchX}
          title="No issues found"
          description="Try adjusting your filters."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input placeholder="Search issues…" aria-label="Search issues" className="pl-8" />
            </div>
            {/* Phase 4: wire to URL state — visual placeholders for now. */}
            <Select>
              <SelectTrigger className="w-32" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
            </Select>
            <Select>
              <SelectTrigger className="w-32" aria-label="Filter by priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
            </Select>
          </div>

          <div className="divide-y divide-border rounded-lg border bg-card">
            {ISSUES.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {ISSUES.length} of {TOTAL_ISSUES} issues
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" disabled aria-label="Previous page">
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Page 1" aria-current="page">
                1
              </Button>
              <Button variant="ghost" size="icon" aria-label="Page 2">
                2
              </Button>
              <Button variant="ghost" size="icon" aria-label="Page 3">
                3
              </Button>
              <Button variant="outline" size="icon" disabled aria-label="Next page">
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
