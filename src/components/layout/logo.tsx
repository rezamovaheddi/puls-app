import { Activity } from "lucide-react";

interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-primary/90 to-primary text-primary-foreground">
        <Activity className="size-4" aria-hidden="true" />
      </div>
      {!compact && (
        <span className="text-base font-semibold tracking-tight">Pulse</span>
      )}
    </div>
  );
}
