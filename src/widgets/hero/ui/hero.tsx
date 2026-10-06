import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

/**
 * Landing stage: always-dark hero with the animated aurora / grid floor /
 * horizon beam layers defined in src/app/globals.css (.hero-* classes).
 * Global effects styling stays in the app layer by design (see ADR-003).
 */
export function Hero() {
  return (
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
          Pulse is the control room for your engineering team — plan projects,
          track issues, and keep every release on course from one fast, focused
          workspace.
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
  );
}
