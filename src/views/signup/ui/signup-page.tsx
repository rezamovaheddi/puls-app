"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, AlertCircle } from "lucide-react";
import { ApiError, signup } from "@/shared/api";
import { setSessionUser } from "@/features/session";
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

export function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const user = await signup(form);
      setSessionUser(user);
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields ?? {});
      } else {
        setError("Unexpected error. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  const fields = [
    { id: "first_name", label: "First name", type: "text", autoComplete: "given-name" },
    { id: "last_name", label: "Last name", type: "text", autoComplete: "family-name" },
    { id: "email", label: "Email", type: "email", autoComplete: "email" },
    {
      id: "password",
      label: "Password",
      type: "password",
      autoComplete: "new-password",
      hint: "At least 8 characters, not too common.",
    },
  ] as const;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" aria-hidden="true" />
        </span>
        Pulse
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription>Start your workspace in under a minute.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : null}
            {fields.map(({ id, label, type, autoComplete, ...rest }) => (
              <div key={id} className="flex flex-col gap-2">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  name={id}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  value={form[id]}
                  onChange={update(id)}
                  aria-invalid={Boolean(fieldErrors[id])}
                />
                {"hint" in rest && rest.hint ? (
                  <p className="text-xs text-muted-foreground">{rest.hint}</p>
                ) : null}
                {fieldErrors[id] ? (
                  <p className="text-xs text-destructive">{fieldErrors[id][0]}</p>
                ) : null}
              </div>
            ))}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
