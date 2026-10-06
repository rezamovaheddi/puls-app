import type { Person } from "@/shared/types/person";

export type Activity = {
  id: string;
  actor: Person;
  action: string;
  target: string;
  time: string;
};
