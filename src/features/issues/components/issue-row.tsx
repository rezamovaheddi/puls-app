import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/features/issues/components/priority-badge";
import { StatusBadge } from "@/features/issues/components/status-badge";
import type { MockIssue } from "@/types/pulse";

export function IssueRow({ issue }: { issue: MockIssue }) {
  return (
    // Not a link yet — the issue detail page lands in phase 3.
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <PriorityBadge priority={issue.priority} />
      <span className="font-mono text-xs text-muted-foreground">{issue.key}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate text-sm font-medium">{issue.title}</span>
        {issue.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-[10px]">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Avatar size="sm" title={issue.assignee.name}>
          <AvatarFallback>{issue.assignee.initials}</AvatarFallback>
        </Avatar>
        <StatusBadge status={issue.status} />
      </div>
    </div>
  );
}
