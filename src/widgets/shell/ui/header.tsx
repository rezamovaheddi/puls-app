"use client";

import { LogOut, Search, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signOut, useSession } from "@/features/session";
import { ModeToggle } from "@/features/theme-switcher";
import { MobileNav } from "./mobile-nav";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function initialsOf(first: string, last: string, email: string): string {
  const letters = `${first.charAt(0)}${last.charAt(0)}`.trim();
  return letters || email.slice(0, 2).toUpperCase();
}

export function Header() {
  const router = useRouter();
  const { user } = useSession();
  const initials = user
    ? initialsOf(user.first_name, user.last_name, user.email)
    : "…";

  async function handleSignOut() {
    await signOut();
    toast("Signed out", { description: "See you soon." });
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6 lg:px-8">
      <MobileNav />
      <Button
        variant="outline"
        size="sm"
        aria-label="Search"
        onClick={() =>
          toast("Command palette", { description: "Ships in Phase 7" })
        }
        className="hidden h-8 w-60 justify-between gap-2 pr-1.5 font-normal text-muted-foreground sm:flex"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />
          Search...
        </span>
        <kbd
          data-slot="kbd"
          className="inline-flex h-5 select-none items-center rounded-sm border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
        >
          ⌘K
        </kbd>
      </Button>

      <div className="flex-1" />

      <ModeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Open user menu"
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            {user ? (
              <>
                <p className="text-sm font-medium">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </>
            ) : (
              "Loading…"
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              toast("Profile", { description: "Available in a later phase" })
            }
          >
            <User aria-hidden="true" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              toast("Settings", { description: "Available in a later phase" })
            }
          >
            <Settings aria-hidden="true" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
