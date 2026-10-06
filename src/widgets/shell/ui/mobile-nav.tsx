"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "./logo";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { mainNav, secondaryNav, type NavItem } from "../config/nav";
import { cn } from "@/shared/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);

  return (
    <li>
      <SheetClose asChild>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          {item.title}
        </Link>
      </SheetClose>
    </li>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <Logo />
        </div>
        <nav
          aria-label="Main navigation"
          className="flex flex-col overflow-y-auto p-2"
        >
          <ul className="flex flex-col gap-0.5">
            {mainNav.map((item) => (
              <MobileNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
          <Separator className="my-2" />
          <ul className="flex flex-col gap-0.5">
            {secondaryNav.map((item) => (
              <MobileNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
