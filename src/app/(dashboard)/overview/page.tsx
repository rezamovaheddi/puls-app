import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACTIVITIES } from "@/lib/mock/activity";
import { PROJECTS } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";

// Weekly completed-issues series. Heights must be literal arbitrary-value
// classes for Tailwind's scanner; dynamic `h-[${n}%]` strings are never seen.
const WEEKLY_VELOCITY = [
  "h-[35%]",
  "h-[42%]",
  "h-[38%]",
  "h-[50%]",
  "h-[46%]",
  "h-[58%]",
  "h-[54%]",
  "h-[61%]",
  "h-[57%]",
  "h-[66%]",
  "h-[62%]",
  "h-[72%]",
] as const;

// Same 5%-step palette as ProjectCard; index = progress / 5.
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

const STATS = [
  { label: "Active projects", value: "2", delta: "+1", trend: "up" },
  { label: "Open issues", value: "54", delta: "+12%", trend: "up" },
  { label: "Velocity", value: "23", delta: "+8%", trend: "up" },
  { label: "Avg. resolution", value: "2.4d", delta: "-15%", trend: "down" },
] as const;

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" description="Workspace summary at a glance">
        <Button asChild>
          <Link href="/projects">
            <Plus aria-hidden="true" />
            New project
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardAction>
              <Badge variant="outline">
                {stat.trend === "up" ? (
                  <TrendingUp aria-hidden="true" />
                ) : (
                  <TrendingDown aria-hidden="true" />
                )}
                {stat.delta}
              </Badge>
            </CardAction>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Velocity</CardTitle>
          <CardDescription>Issues completed per week</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="img"
            aria-label="Issues completed per week over the last 12 weeks"
            className="flex h-40 items-end gap-1.5"
          >
            {WEEKLY_VELOCITY.map((height, index) => (
              <div
                key={height}
                className={cn(
                  "w-full flex-1 rounded-sm",
                  index === WEEKLY_VELOCITY.length - 1 ? "bg-primary/70" : "bg-muted/60",
                  height
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {ACTIVITIES.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>{activity.actor.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-sm leading-snug">
                      {activity.actor.name}{" "}
                      <span className="font-medium">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {PROJECTS.map((project) => (
                <li key={project.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary",
                        PROGRESS_WIDTHS[project.progress / 5]
                      )}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
