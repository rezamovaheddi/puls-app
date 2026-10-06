import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="ml-auto h-5 w-14 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-3 w-40" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
