import type { ReactNode } from "react";

import { AppShell } from "@/widgets/shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
