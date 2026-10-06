import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { ACTIVITIES } from "../src/entities/activity/model/mock-data.ts";
import { ISSUES } from "../src/entities/issue/model/mock-data.ts";
import { PROJECTS } from "../src/entities/project/model/mock-data.ts";
import { mainNav, secondaryNav } from "../src/widgets/shell/config/nav.ts";
import type { IssuePriority, IssueStatus } from "../src/entities/issue/model/types.ts";
import type { ProjectStatus } from "../src/entities/project/model/types.ts";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["planning", "active", "paused", "completed"];
const ISSUE_STATUSES: readonly IssueStatus[] = ["todo", "in-progress", "review", "done"];
const ISSUE_PRIORITIES: readonly IssuePriority[] = ["low", "medium", "high", "urgent"];

function uniqueBy<T>(items: T[], key: (item: T) => string): string[] {
  const seen: string[] = [];
  for (const item of items) {
    assert.ok(!seen.includes(key(item)), `duplicate ${key.name}: ${key(item)}`);
    seen.push(key(item));
  }
  return seen;
}

describe("mock projects", () => {
  it("have unique ids and keys", () => {
    uniqueBy(PROJECTS, (p) => p.id);
    uniqueBy(PROJECTS, (p) => p.key);
  });

  it("have valid status, progress, and issue counts", () => {
    for (const project of PROJECTS) {
      assert.ok(PROJECT_STATUSES.includes(project.status), `bad status: ${project.status}`);
      assert.ok(project.progress >= 0 && project.progress <= 100, `bad progress: ${project.key}`);
      assert.ok(project.openIssues <= project.totalIssues, `bad counts: ${project.key}`);
    }
  });
});

describe("mock issues", () => {
  it("have unique ids and keys", () => {
    uniqueBy(ISSUES, (i) => i.id);
    uniqueBy(ISSUES, (i) => i.key);
  });

  it("have valid status and priority", () => {
    for (const issue of ISSUES) {
      assert.ok(ISSUE_STATUSES.includes(issue.status), `bad status: ${issue.key}`);
      assert.ok(ISSUE_PRIORITIES.includes(issue.priority), `bad priority: ${issue.key}`);
    }
  });

  it("reference an existing project key", () => {
    const keys = PROJECTS.map((p) => p.key);
    for (const issue of ISSUES) {
      assert.ok(keys.includes(issue.projectKey), `unknown project: ${issue.projectKey}`);
    }
  });
});

describe("mock activity", () => {
  it("have unique ids and non-empty entries", () => {
    uniqueBy(ACTIVITIES, (a) => a.id);
    for (const activity of ACTIVITIES) {
      assert.ok(activity.actor.name.length > 0, "actor name is empty");
      assert.ok(activity.actor.initials.length > 0, "actor initials are empty");
      assert.ok(activity.action.length > 0, "action is empty");
      assert.ok(activity.target.length > 0, "target is empty");
      assert.ok(activity.time.length > 0, "time is empty");
    }
  });
});

describe("nav config", () => {
  const navs = [
    { name: "mainNav", items: mainNav },
    { name: "secondaryNav", items: secondaryNav },
  ];

  for (const { name, items } of navs) {
    it(`${name} has unique, internal, non-empty entries`, () => {
      const hrefs = uniqueBy(items, (item) => item.href);
      for (const href of hrefs) {
        assert.ok(href.startsWith("/"), `${name} href is not internal: ${href}`);
      }
      for (const item of items) {
        assert.ok(item.title.length > 0, `${name} has an empty title`);
      }
    });
  }
});
