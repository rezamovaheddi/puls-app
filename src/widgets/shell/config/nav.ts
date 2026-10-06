import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Issues", href: "/issues", icon: CircleDot },
  { title: "Analytics", href: "/analytics", icon: TrendingUp },
];

export const secondaryNav: NavItem[] = [
  { title: "Docs", href: "/docs", icon: FileText },
  { title: "Assistant", href: "/assistant", icon: Sparkles },
  { title: "Settings", href: "/settings", icon: Settings },
];
