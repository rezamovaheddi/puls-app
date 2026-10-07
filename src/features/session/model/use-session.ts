"use client";

import { useEffect, useState } from "react";

import { fetchCurrentUser, logout as logoutApi } from "@/shared/api";
import type { UserDto } from "@/shared/api";

/**
 * Session model — a module-level cache so the header, the gate and the pages
 * share one /me call per page load.
 */
let sessionPromise: Promise<UserDto | null> | null = null;

function loadSession(): Promise<UserDto | null> {
  sessionPromise ??= fetchCurrentUser();
  return sessionPromise;
}

function resetSessionCache() {
  sessionPromise = null;
}

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  user: UserDto | null;
}

export function useSession(): Session {
  const [session, setSession] = useState<Session>(() => ({
    status: "loading",
    user: null,
  }));

  useEffect(() => {
    let cancelled = false;
    loadSession().then((user) => {
      if (cancelled) return;
      setSession(
        user
          ? { status: "authenticated", user }
          : { status: "anonymous", user: null },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}

export async function signOut(): Promise<void> {
  await logoutApi();
  resetSessionCache();
}
