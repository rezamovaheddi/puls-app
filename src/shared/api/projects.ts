/**
 * Projects and Tasks API client — connects to the Pulse backend.
 */

import { apiFetch } from "./client";
import type { UserDto } from "./auth";

export type ProjectRole = "OWNER" | "LEAD" | "DEVELOPER" | "VIEWER";
export type ProjectStatus = "planning" | "active" | "paused" | "completed";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectMemberDto {
  id: string;
  user: UserDto;
  role: ProjectRole;
  assigned_at: string;
}

export interface ProjectDto {
  id: string;
  workspace: string;
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  members: ProjectMemberDto[];
  open_tasks: number;
  total_tasks: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDto {
  id: string;
  project: string;
  project_key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0 to 100
  assignee: UserDto | null;
  role_required: ProjectRole;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  status?: ProjectStatus;
  initial_members?: { email: string; role: ProjectRole }[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  role_required?: ProjectRole;
  assignee_id?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  role_required?: ProjectRole;
  assignee_id?: number | null;
}

export async function listProjects(workspaceId: string): Promise<ProjectDto[]> {
  const result = await apiFetch<ProjectDto[]>(`/workspaces/${workspaceId}/projects`);
  return result.data;
}

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput,
): Promise<ProjectDto> {
  const result = await apiFetch<ProjectDto>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: input,
  });
  return result.data;
}

export async function assignProjectMember(
  projectId: string,
  input: { email: string; role: ProjectRole },
): Promise<ProjectMemberDto> {
  const result = await apiFetch<ProjectMemberDto>(`/projects/${projectId}/members`, {
    method: "POST",
    body: input,
  });
  return result.data;
}

export async function listWorkspaceTasks(workspaceId: string): Promise<TaskDto[]> {
  const result = await apiFetch<TaskDto[]>(`/workspaces/${workspaceId}/tasks`);
  return result.data;
}

export async function listProjectTasks(projectId: string): Promise<TaskDto[]> {
  const result = await apiFetch<TaskDto[]>(`/projects/${projectId}/tasks`);
  return result.data;
}

export async function createTask(
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskDto> {
  const result = await apiFetch<TaskDto>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: input,
  });
  return result.data;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskDto> {
  const result = await apiFetch<TaskDto>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: input,
  });
  return result.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
