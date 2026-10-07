/** Auth API contracts — mirrors backend/apps/users. */

import { apiFetch, setAccessToken, clearAccessToken, getAccessToken } from "./client";

export interface UserDto {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthResultDto {
  user: UserDto;
  access: string;
  refresh?: string;
}

export async function signup(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<UserDto> {
  const result = await apiFetch<AuthResultDto>("/auth/signup", {
    method: "POST",
    body: input,
    auth: false,
  });
  setAccessToken(result.data.access);
  return result.data.user;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<UserDto> {
  const result = await apiFetch<AuthResultDto>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
  setAccessToken(result.data.access);
  return result.data.user;
}

export async function fetchCurrentUser(): Promise<UserDto | null> {
  if (!getAccessToken()) return null;
  try {
    const result = await apiFetch<UserDto>("/auth/me");
    return result.data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST", auth: false });
  } finally {
    clearAccessToken();
  }
}
