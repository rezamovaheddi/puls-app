import type { Person } from "@/shared/types/person";

export type ProjectStatus = "planning" | "active" | "paused" | "completed";

export type Project = {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: Person;
  progress: number;
  openIssues: number;
  totalIssues: number;
  lastUpdated: string;
};
