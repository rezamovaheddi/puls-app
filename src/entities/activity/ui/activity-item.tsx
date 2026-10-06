import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

import type { Activity } from "../model/types";

export function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <li className="flex items-start gap-3">
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
  );
}
