"use client";

import { LogOut, Search, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { ModeToggle } from "@/components/layout/mode-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
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
                RM
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onSelect={() =>
              toast("Profile", { description: "Available in Phase 2" })
            }
          >
            <User aria-hidden="true" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              toast("Settings", { description: "Available in Phase 2" })
            }
          >
            <Settings aria-hidden="true" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              toast("Sign out", { description: "Auth arrives in Phase 2" })
            }
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
