import { CircleDot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MockProject, ProjectStatus } from "@/types/pulse";

// Percent widths must appear in source as literal arbitrary-value classes for
// Tailwind's scanner; mock progress values move in 5% steps so this palette
// covers every bar. Index = progress / 5.
const PROGRESS_WIDTHS = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-[100%]",
] as const;

const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: "secondary" | "outline"; className?: string }
> = {
  planning: { label: "Planning", variant: "secondary" },
  active: {
    label: "Active",
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  paused: {
    label: "Paused",
    variant: "outline",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  completed: { label: "Completed", variant: "outline", className: "text-muted-foreground" },
};

export function ProjectCard({ project }: { project: MockProject }) {
  const status = PROJECT_STATUS_CONFIG[project.status];
  const progressStep = Math.min(Math.max(Math.round(project.progress / 5) * 5, 0), 100);
  const widthClass = PROGRESS_WIDTHS[progressStep / 5];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight">
            {project.name}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {project.key}
          </Badge>
          <Badge variant={status.variant} className={cn("ml-auto", status.className)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div className={cn("h-full rounded-full bg-primary", widthClass)} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {project.progress}%
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-1.5 text-xs text-muted-foreground">
        <CircleDot className="size-3" aria-hidden="true" />
        <span>{project.openIssues} open</span>
        <span aria-hidden="true">·</span>
        <span>{project.lastUpdated}</span>
        <Avatar className="ml-auto size-5" title={project.owner.name}>
          <AvatarFallback className="text-[10px]">{project.owner.initials}</AvatarFallback>
        </Avatar>
      </CardFooter>
    </Card>
  );
}
