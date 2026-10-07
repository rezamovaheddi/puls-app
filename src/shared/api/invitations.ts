/** Invitation API contracts — mirrors backend/apps/invitations. */

import { apiFetch } from "./client";

export interface InvitationDto {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
  /** Only present in the create response — the inviter shares it. */
  token?: string;
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}): Promise<InvitationDto> {
  const result = await apiFetch<InvitationDto>(
    `/workspaces/${input.workspaceId}/invitations`,
    { method: "POST", body: { email: input.email, role: input.role } },
  );
  return result.data;
}

export async function acceptInvitation(
  token: string,
): Promise<{ workspace_id: string; role: string }> {
  const result = await apiFetch<{ workspace_id: string; role: string }>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
  return result.data;
}

/** The shareable API link an inviter hands to the member (no email service yet). */
export function acceptLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${base}/api/v1/invitations/${encodeURIComponent(token)}/accept`;
}
