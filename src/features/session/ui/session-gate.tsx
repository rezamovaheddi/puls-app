"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Skeleton } from "@/shared/ui/skeleton";

import { useSession } from "../model/use-session";

/**
 * Client-side auth gate for the dashboard shell: anonymous visitors are sent
 * to /login; the authenticated shell renders once the session resolves.
 * (Server-side enforcement stays in the backend — this only routes UI.)
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
