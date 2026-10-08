"use client";

import { useSyncExternalStore, useEffect } from "react";
import { fetchCurrentUser, logout as logoutApi } from "@/shared/api";
import type { UserDto } from "@/shared/api";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  user: UserDto | null;
}

let currentSession: Session = {
  status: "loading",
  user: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function setSessionUser(user: UserDto | null) {
  currentSession = user
    ? { status: "authenticated", user }
    : { status: "anonymous", user: null };
  notify();
}

let isFetching = false;

export async function refreshSession(): Promise<UserDto | null> {
  if (isFetching) return currentSession.user;
  isFetching = true;
  try {
    const user = await fetchCurrentUser();
    setSessionUser(user);
    return user;
  } catch {
    setSessionUser(null);
    return null;
  } finally {
    isFetching = false;
  }
}

export function useSession(): Session {
  const session = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => currentSession,
    () => ({ status: "loading" as SessionStatus, user: null }),
  );

  useEffect(() => {
    if (currentSession.status === "loading" && !isFetching) {
      refreshSession();
    }
  }, []);

  return session;
}

export async function signOut(): Promise<void> {
  try {
    await logoutApi();
  } finally {
    setSessionUser(null);
  }
}
