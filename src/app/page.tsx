import { Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            Pulse
          </Link>
          <nav className="flex items-center gap-6" aria-label="Main">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
            <Button asChild>
              <Link href="/overview">Open dashboard</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <section className="py-24 md:py-32">
          <div className="container mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <Badge variant="outline">Private beta</Badge>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Ship software at the{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-blue-500 bg-clip-text text-transparent">
                speed of thought
              </span>
            </h1>
            <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
              Pulse is the control room for your engineering team — plan projects, track
              issues, and keep every release on course from one fast, focused workspace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/overview">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          © 2026 Pulse
        </div>
      </footer>
    </div>
  );
}
