import { Skeleton } from "@/shared/ui/skeleton";

export function IssuesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 sm:max-w-xs" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="divide-y divide-border rounded-lg border bg-card">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
