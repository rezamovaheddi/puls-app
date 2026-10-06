"use client";

import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description={
        error.digest
          ? `An unexpected error occurred. Reference: ${error.digest}`
          : "An unexpected error occurred while rendering this view."
      }
    >
      <Button onClick={reset}>Try again</Button>
    </ErrorState>
  );
}
