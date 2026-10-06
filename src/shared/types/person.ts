/**
 * Kernel value object shared by several entities (project owner, issue
 * assignee, activity actor). Domain primitives like this live in shared so
 * entities never import each other (FSD cross-import rule).
 */
export type Person = {
  name: string;
  initials: string;
};
