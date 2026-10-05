import { Badge } from "@/components/ui/badge";
import type { IssueStatus } from "@/types/pulse";

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; variant: "secondary" | "outline"; className?: string }
> = {
  todo: { label: "To do", variant: "secondary" },
  "in-progress": {
    label: "In Progress",
    variant: "outline",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  review: {
    label: "Review",
    variant: "outline",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  done: {
    label: "Done",
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
