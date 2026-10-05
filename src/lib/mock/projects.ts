import type { MockProject } from "@/types/pulse";

export const PROJECTS: MockProject[] = [
  {
    id: "proj-pulse-web",
    key: "PW",
    name: "Pulse Web",
    description:
      "Customer-facing web application covering dashboards, billing flows, and account management.",
    status: "active",
    owner: { name: "Maya Chen", initials: "MC" },
    progress: 70,
    openIssues: 14,
    totalIssues: 86,
    lastUpdated: "2h ago",
  },
  {
    id: "proj-pulse-mobile",
    key: "PM",
    name: "Pulse Mobile",
    description:
      "Cross-platform mobile client with offline-first sync, push notifications, and biometric auth.",
    status: "active",
    owner: { name: "Arun Patel", initials: "AP" },
    progress: 45,
    openIssues: 23,
    totalIssues: 64,
    lastUpdated: "5h ago",
  },
  {
    id: "proj-design-system",
    key: "DS",
    name: "Design System",
    description:
      "Shared component library, design tokens, and usage docs powering every Pulse surface.",
    status: "planning",
    owner: { name: "Sofia Reyes", initials: "SR" },
    progress: 35,
    openIssues: 9,
    totalIssues: 41,
    lastUpdated: "1d ago",
  },
  {
    id: "proj-billing-service",
    key: "BS",
    name: "Billing Service",
    description:
      "Usage-based metering, invoicing, and payment provider integrations behind a versioned API.",
    status: "paused",
    owner: { name: "Jonas Weber", initials: "JW" },
    progress: 60,
    openIssues: 6,
    totalIssues: 37,
    lastUpdated: "3d ago",
  },
  {
    id: "proj-marketing-site",
    key: "MS",
    name: "Marketing Site",
    description:
      "Public marketing site with CMS-driven content, SEO landing pages, and the docs portal.",
    status: "completed",
    owner: { name: "Elena Petrova", initials: "EP" },
    progress: 90,
    openIssues: 2,
    totalIssues: 28,
    lastUpdated: "1w ago",
  },
];
