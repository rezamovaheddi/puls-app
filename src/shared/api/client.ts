/**
 * Low-level API client for the Pulse Django backend.
 *
 * - Unwraps the backend envelope: success → {data, message}, failure → throw ApiError.
 * - Attaches the Bearer access token (kept in localStorage; the refresh token
 *   lives in an HttpOnly cookie set by the backend — JS can never read it).
 * - On 401 it transparently refreshes once via the cookie and retries; if the
 *   refresh fails the session is cleared and the user lands on /login.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_KEY = "pulse.access_token";

export interface ApiErrorDetail {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string[]> | null;
}

export class ApiError extends Error implements ApiErrorDetail {
  status: number;
  code: string;
  fields?: Record<string, string[]> | null;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = "ApiError";
    this.status = detail.status;
    this.code = detail.code;
    this.fields = detail.fields;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function clearAccessToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the Bearer token (default true). */
  auth?: boolean;
  _retried?: boolean;
}

export interface ApiResult<T> {
  data: T;
  message?: string;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return false;
    const json = await response.json();
    if (typeof json?.data?.access !== "string") return false;
    setAccessToken(json.data.access);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = true, _retried = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Cannot reach the Pulse API. Is the backend running?",
    });
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = (json && typeof json === "object" && "error" in json)
      ? (json as { error: ApiErrorDetail }).error
      : { code: "INTERNAL_ERROR", message: "Unexpected error.", fields: null };

    if (
      response.status === 401 &&
      auth &&
      !_retried &&
      detail.code !== "INVALID_CREDENTIALS"
    ) {
      // Access token expired → one silent refresh + retry.
      if (await tryRefresh()) {
        return apiFetch<T>(path, { ...options, _retried: true });
      }
      clearAccessToken();
    }
    throw new ApiError({ ...detail, status: response.status });
  }

  return {
    data: (json as { data: T }).data,
    message: (json as { message?: string }).message,
  };
}
