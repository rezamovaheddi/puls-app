import type { Person } from "@/shared/types/person";

export type IssueStatus = "todo" | "in-progress" | "review" | "done";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type Issue = {
  id: string;
  key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee: Person;
  projectKey: string;
  labels: string[];
  updatedAt: string;
};
