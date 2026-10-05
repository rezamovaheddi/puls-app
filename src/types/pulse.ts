/**
 * Shared domain types for Pulse.
 * Pages and feature components consume these shapes verbatim until the API
 * phase replaces the mock sources under `src/lib/mock`.
 */

export type MockPerson = {
  name: string;
  initials: string;
};

export type ProjectStatus = "planning" | "active" | "paused" | "completed";

export type IssueStatus = "todo" | "in-progress" | "review" | "done";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type MockProject = {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: MockPerson;
  progress: number;
  openIssues: number;
  totalIssues: number;
  lastUpdated: string;
};

export type MockIssue = {
  id: string;
  key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee: MockPerson;
  projectKey: string;
  labels: string[];
  updatedAt: string;
};

export type MockActivity = {
  id: string;
  actor: MockPerson;
  action: string;
  target: string;
  time: string;
};
