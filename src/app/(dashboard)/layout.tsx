import type { ReactNode } from "react";

import { SessionGate } from "@/features/session";
import { AppShell } from "@/widgets/shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <SessionGate>{children}</SessionGate>
    </AppShell>
  );
}
