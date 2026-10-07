"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useSession } from "@/features/session";
import { ApiError, acceptInvitation } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

/**
 * Landing spot for an invited member: POSTs the invitation token with their
 * own account, then sends them to the dashboard. Anonymous visitors are sent
 * to sign up first (the backend enforces email match).
 */
export function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { status } = useSession();
  const [state, setState] = useState<"pending" | "accepted" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    if (status !== "authenticated" || state !== "pending") return;

    let cancelled = false;
    acceptInvitation(token)
      .then(() => {
        if (!cancelled) setState("accepted");
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        setError(err instanceof ApiError ? err.message : "Unexpected error.");
      });
    return () => {
      cancelled = true;
    };
  }, [status, token, state, router]);

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {state === "accepted" ? (
              <>
                <CheckCircle2 className="size-5 text-emerald-500" aria-hidden="true" />
                You&apos;re in!
              </>
            ) : state === "error" ? (
              "Invitation problem"
            ) : (
              "Accepting invitation…"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {state === "accepted" ? (
            <p className="text-sm text-muted-foreground">
              You are now a member of the workspace. Head to your dashboard to see it.
            </p>
          ) : null}
          <Button asChild>
            <Link href="/overview">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
