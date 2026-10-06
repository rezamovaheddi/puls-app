import { Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Hero } from "@/widgets/hero";

/* The marketing stage is always dark, like vercel.com — it intentionally
   ignores the app theme so the animated hero reads the same for everyone. */
export function LandingPage() {
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
            <Button asChild className="bg-white text-black hover:bg-white/85">
              <Link href="/overview">Open dashboard</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <Hero />
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
