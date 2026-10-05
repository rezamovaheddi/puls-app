import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IssuePriority } from "@/types/pulse";

const PRIORITY_CONFIG: Record<
  IssuePriority,
  { label: string; icon: typeof ArrowUp; className?: string }
> = {
  low: { label: "Low", icon: ArrowDown, className: "text-muted-foreground" },
  medium: { label: "Medium", icon: ArrowRight },
  high: {
    label: "High",
    icon: ArrowUp,
    className: "text-amber-600 dark:text-amber-400",
  },
  urgent: {
    label: "Urgent",
    icon: ArrowUp,
    className: "text-red-600 dark:text-red-400",
  },
};

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
