import type { ReactNode } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

/**
 * Dashboard chrome: fixed sidebar + sticky header around routed content.
 * Next.js keeps only a thin re-export in src/app/(dashboard)/layout.tsx.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
