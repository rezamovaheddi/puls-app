"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, MailPlus, SkipForward } from "lucide-react";
import { useSession } from "@/features/session";
import {
  ApiError,
  acceptLink,
  createInvitation,
  createWorkspace,
  type WorkspaceDto,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

type Step = "create" | "invite";

interface InvitedEntry {
  email: string;
  role: string;
  token?: string;
}

export function OnboardingPage() {
  const router = useRouter();
  const { status, user } = useSession();
  const [step, setStep] = useState<Step>("create");
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<InvitedEntry[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  useEffect(() => {
    // Onboarding is for fresh signups only.
    if (status === "anonymous") {
      router.replace("/signup");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await createWorkspace({ name: name.trim() });
      setWorkspace(created);
      setStep("invite");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    setPending(true);
    setError(null);
    try {
      const invitation = await createInvitation({
        workspaceId: workspace.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInvited((prev) => [
        ...prev,
        { email: invitation.email, role: invitation.role, token: invitation.token },
      ]);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          Step {step === "create" ? "1" : "2"} of 2
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {step === "create" ? `Create your workspace, ${user?.first_name}` : "Invite your team"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "create"
            ? "A workspace is home for your projects and issues."
            : "Add people by email — they accept from their own account. You can skip this."}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {step === "create" ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  required
                  maxLength={100}
                  placeholder="Acme Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending || name.trim().length === 0}>
                {pending ? "Creating…" : "Create workspace"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members of <span className="font-mono text-sm">{workspace?.slug}</span>
            </CardTitle>
            <CardDescription>
              {invited.length === 0
                ? "No one invited yet."
                : `${invited.length} pending invitation${invited.length > 1 ? "s" : ""}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="teammate@acme.dev"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "ADMIN" | "MEMBER")}>
                    <SelectTrigger id="invite-role" className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={pending}>
                <MailPlus aria-hidden="true" />
                {pending ? "Inviting…" : "Send invite"}
              </Button>
            </form>

            {invited.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {invited.map((entry) => (
                  <li
                    key={entry.email}
                    className="flex flex-col gap-1 rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{entry.email}</span>
                      <Badge variant="outline">{entry.role}</Badge>
                    </div>
                    {entry.token ? (
                      <code className="break-all text-xs text-muted-foreground">
                        {acceptLink(entry.token)}
                      </code>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <Button
              onClick={() => router.replace("/overview")}
              disabled={pending}
              className="mt-2"
            >
              {invited.length > 0 ? "Continue to dashboard" : "Skip for now"}
              <SkipForward aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
