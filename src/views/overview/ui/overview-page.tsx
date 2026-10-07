"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { ACTIVITIES, ActivityItem } from "@/entities/activity";
import { PROJECTS } from "@/entities/project";
import { WorkspaceCard } from "@/entities/workspace";
import { useSession } from "@/features/session";
import { ApiError, listWorkspaces, type WorkspaceDto } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { cn } from "@/shared/lib/utils";

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
  "w-0", "w-[5%]", "w-[10%]", "w-[15%]", "w-[20%]",
  "w-[25%]", "w-[30%]", "w-[35%]", "w-[40%]", "w-[45%]",
  "w-[50%]", "w-[55%]", "w-[60%]", "w-[65%]", "w-[70%]",
  "w-[75%]", "w-[80%]", "w-[85%]", "w-[90%]", "w-[95%]",
  "w-[100%]",
] as const;

const STATS = [
  { label: "Active projects", value: "2", delta: "+1", trend: "up" },
  { label: "Open issues", value: "54", delta: "+12%", trend: "up" },
  { label: "Velocity", value: "23", delta: "+8%", trend: "up" },
  { label: "Avg. resolution", value: "2.4d", delta: "-15%", trend: "down" },
] as const;

export function OverviewPage() {
  const { user } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWorkspaces()
      .then((data) => {
        if (!cancelled) setWorkspaces(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load workspaces.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description={user ? `Signed in as ${user.email}` : "Workspace summary at a glance"}
      >
        <Button asChild>
          <Link href="/onboarding">
            <Plus aria-hidden="true" />
            New workspace
          </Link>
        </Button>
      </PageHeader>

      <section aria-label="Your workspaces" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Your workspaces</h2>
          <Badge
            variant="outline"
            className="text-[10px] text-emerald-600 dark:text-emerald-400"
          >
            Live API
          </Badge>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : workspaces && workspaces.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No workspaces yet"
            description="Create your first workspace to start planning projects."
          >
            <Button asChild>
              <Link href="/onboarding">Create workspace</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(workspaces ?? []).map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Demo sections" className="flex flex-col gap-3">
        <Badge variant="outline" className="w-fit text-[10px] text-muted-foreground">
          Demo data — wired to the real API in Phase 3
        </Badge>

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
                    index === WEEKLY_VELOCITY.length - 1
                      ? "bg-primary/70"
                      : "bg-muted/60",
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
                  <ActivityItem key={activity.id} activity={activity} />
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
      </section>
    </div>
  );
}
