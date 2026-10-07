/** Workspace API contracts — mirrors backend/apps/workspaces. */

import { apiFetch } from "./client";

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  role?: string;
}

export async function listWorkspaces(): Promise<WorkspaceDto[]> {
  const result = await apiFetch<WorkspaceDto[]>("/workspaces");
  return result.data;
}

export async function createWorkspace(input: {
  name: string;
}): Promise<WorkspaceDto> {
  const result = await apiFetch<WorkspaceDto>("/workspaces", {
    method: "POST",
    body: input,
  });
  return result.data;
}
