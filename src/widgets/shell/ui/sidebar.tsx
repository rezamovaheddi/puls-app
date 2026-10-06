"use client";

import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { Logo } from "./logo";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { mainNav, secondaryNav, type NavItem } from "../config/nav";
import { cn } from "@/shared/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "pulse.sidebar.collapsed";

// localStorage is an external store: reading it through useSyncExternalStore
// keeps the server snapshot (expanded) until hydration, so the initial markup
// never desyncs and no setState-in-effect cascade is needed.
let cachedCollapsed: boolean | null = null;
const collapseListeners = new Set<() => void>();

function getCollapsedSnapshot() {
  if (cachedCollapsed === null) {
    cachedCollapsed =
      window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  }
  return cachedCollapsed;
}

function getServerCollapsedSnapshot() {
  return false;
}

function subscribeCollapsed(onChange: () => void) {
  collapseListeners.add(onChange);
  return () => collapseListeners.delete(onChange);
}

function toggleCollapsed() {
  const next = !getCollapsedSnapshot();
  cachedCollapsed = next;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  for (const listener of collapseListeners) listener();
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("truncate", collapsed && "hidden")}>
        {item.title}
      </span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot
  );

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => (
      <li key={item.href}>
        <SidebarLink
          item={item}
          active={isActive(pathname, item.href)}
          collapsed={collapsed}
        />
      </li>
    ));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-[3.75rem]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center px-3",
          collapsed ? "flex-col justify-center gap-2 px-2" : "justify-between"
        )}
      >
        <Logo compact={collapsed} />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      <div className="px-3 pb-1">
        <Button
          variant="ghost"
          className={cn(
            "h-9 w-full gap-2",
            collapsed ? "justify-center px-0" : "justify-start px-2"
          )}
          aria-label={collapsed ? "Acme Inc" : undefined}
        >
          <Avatar className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              A
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <span className="truncate text-sm font-medium">Acme Inc</span>
              <ChevronsUpDown
                className="ml-auto size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      </div>

      <TooltipProvider>
        <nav
          aria-label="Main navigation"
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-2",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <ul className="flex flex-col gap-0.5">{renderNavItems(mainNav)}</ul>
          <Separator className="my-2 shrink-0 bg-sidebar-border" />
          <ul className="flex flex-col gap-0.5">{renderNavItems(secondaryNav)}</ul>
        </nav>
      </TooltipProvider>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Avatar>
            <AvatarFallback className="text-xs font-medium">RM</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium leading-none">Reza M.</p>
              <p className="truncate text-xs text-muted-foreground">
                reza@acme.dev
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
