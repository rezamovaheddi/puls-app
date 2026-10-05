import { Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* The marketing stage is always dark, like vercel.com — it intentionally
   ignores the app theme so the animated hero reads the same for everyone. */
export default function LandingPage() {
  return (
    <div className="min-h-svh bg-black text-white antialiased">
      <header className="border-b border-white/10">
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
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              Docs
            </Link>
            <Button
              asChild
              className="bg-white text-black hover:bg-white/85"
            >
              <Link href="/overview">Open dashboard</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="hero-aurora" />
            <div className="hero-grid-floor" />
            <div className="hero-beam" />
          </div>

          <div className="relative z-10 container mx-auto flex max-w-6xl flex-col items-center gap-7 px-6 pt-32 pb-80 text-center md:pt-40">
            <Badge
              variant="outline"
              className="gap-2 border-white/15 bg-white/5 text-white/70"
            >
              <span
                className="size-1.5 animate-pulse rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Private beta
            </Badge>
            <h1 className="hero-shimmer max-w-3xl text-balance text-5xl font-semibold tracking-tighter md:text-7xl">
              Ship software at the{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-blue-500 bg-clip-text text-transparent">
                speed of thought
              </span>
            </h1>
            <p className="max-w-2xl text-pretty text-lg text-white/60 md:text-xl">
              Pulse is the control room for your engineering team — plan
              projects, track issues, and keep every release on course from one
              fast, focused workspace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-white text-black hover:bg-white/85"
              >
                <Link href="/overview">Get started</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-white/40 sm:flex-row">
          <p>© 2026 Pulse</p>
          <p>Crafted with Next.js, Tailwind CSS and shadcn/ui</p>
        </div>
      </footer>
    </div>
  );
}
