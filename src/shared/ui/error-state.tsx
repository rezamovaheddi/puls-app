import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
