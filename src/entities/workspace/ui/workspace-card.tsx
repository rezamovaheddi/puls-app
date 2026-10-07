import Link from "next/link";
import { Settings, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import type { WorkspaceDto } from "@/shared/api";

const ROLE_STYLE: Record<string, string> = {
  OWNER: "bg-primary/10 text-primary border-primary/20",
  ADMIN: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  MEMBER: "",
};

export function WorkspaceCard({ workspace }: { workspace: WorkspaceDto }) {
  const roleClass = ROLE_STYLE[workspace.role ?? "MEMBER"] ?? "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight">
            {workspace.name}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            /{workspace.slug}
          </Badge>
          <Badge
            variant={workspace.role === "OWNER" ? "default" : "outline"}
            className={`ml-auto ${roleClass}`}
          >
            {workspace.role ?? "Member"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Created {new Date(workspace.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/overview">
            <TrendingUp aria-hidden="true" />
            Open
          </Link>
        </Button>
        {workspace.role === "OWNER" ? (
          <Button variant="ghost" size="sm" aria-label="Workspace settings">
            <Settings aria-hidden="true" />
            Settings
          </Button>
        ) : null}
        <Avatar className="ml-auto size-6" title={`Owned workspace`}>
          <AvatarFallback className="text-[10px]">
            {workspace.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </CardFooter>
    </Card>
  );
}
