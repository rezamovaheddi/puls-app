import type { Activity } from "../model/types";

export const ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    actor: { name: "Jonas Weber", initials: "JW" },
    action: "created",
    target: "BS-118",
    time: "30m ago",
  },
  {
    id: "act-2",
    actor: { name: "Diego Ramos", initials: "DR" },
    action: "reopened",
    target: "PM-184",
    time: "45m ago",
  },
  {
    id: "act-3",
    actor: { name: "Priya Nair", initials: "PN" },
    action: "assigned",
    target: "PM-190",
    time: "1h ago",
  },
  {
    id: "act-4",
    actor: { name: "Arun Patel", initials: "AP" },
    action: "labeled",
    target: "PW-241",
    time: "2h ago",
  },
  {
    id: "act-5",
    actor: { name: "Maya Chen", initials: "MC" },
    action: "resolved",
    target: "PW-238",
    time: "4h ago",
  },
  {
    id: "act-6",
    actor: { name: "Elena Petrova", initials: "EP" },
    action: "commented on",
    target: "MS-031",
    time: "5h ago",
  },
  {
    id: "act-7",
    actor: { name: "Sofia Reyes", initials: "SR" },
    action: "merged",
    target: "DS#48",
    time: "8h ago",
  },
  {
    id: "act-8",
    actor: { name: "Jonas Weber", initials: "JW" },
    action: "deployed",
    target: "Billing Service",
    time: "1d ago",
  },
];
