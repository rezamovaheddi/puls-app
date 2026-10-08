"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Plus, Users, CheckCircle2, AlertCircle } from "lucide-react";
import {
  type ProjectDto,
  type ProjectRole,
  type WorkspaceDto,
  createProject,
  assignProjectMember,
  listProjects,
  listWorkspaces,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

const ROLES: ProjectRole[] = ["LEAD", "DEVELOPER", "VIEWER", "OWNER"];

export function ProjectsPage() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("DEVELOPER");
  const [membersToInvite, setMembersToInvite] = useState<{ email: string; role: ProjectRole }[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Add Member to existing project State
  const [selectedProjectForMember, setSelectedProjectForMember] = useState<ProjectDto | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>("DEVELOPER");
  const [addMemberPending, setAddMemberPending] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const wsList = await listWorkspaces();
        if (wsList.length > 0) {
          const ws = wsList[0];
          setActiveWorkspace(ws);
          const pList = await listProjects(ws.id);
          setProjects(pList);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleAddMemberToList() {
    if (!memberEmail.trim()) return;
    setMembersToInvite((prev) => [...prev, { email: memberEmail.trim(), role: memberRole }]);
    setMemberEmail("");
  }

  function handleRemoveMember(index: number) {
    setMembersToInvite((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setCreatePending(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const newProj = await createProject(activeWorkspace.id, {
        name,
        key: key.trim().toUpperCase(),
        description,
        initial_members: membersToInvite,
      });

      setProjects((prev) => [newProj, ...prev]);
      setCreateSuccess("Project created & invitation emails dispatched via SMTP!");
      setName("");
      setKey("");
      setDescription("");
      setMembersToInvite([]);
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateSuccess(null);
      }, 1500);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreatePending(false);
    }
  }

  async function handleAssignMemberToProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectForMember || !newMemberEmail.trim()) return;
    setAddMemberPending(true);
    setAddMemberMsg(null);

    try {
      await assignProjectMember(selectedProjectForMember.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setAddMemberMsg(`Role ${newMemberRole} assigned and SMTP invite sent to ${newMemberEmail}!`);
      // Reload projects to update members list
      if (activeWorkspace) {
        const updated = await listProjects(activeWorkspace.id);
        setProjects(updated);
      }
      setNewMemberEmail("");
      setTimeout(() => {
        setSelectedProjectForMember(null);
        setAddMemberMsg(null);
      }, 1800);
    } catch (err) {
      setAddMemberMsg(err instanceof Error ? `Error: ${err.message}` : "Failed to assign member");
    } finally {
      setAddMemberPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description={
          activeWorkspace
            ? `Workspace: ${activeWorkspace.name} — Plan and track projects with roles and progress`
            : "Plan and track every workspace project"
        }
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!activeWorkspace}>
              <Plus aria-hidden="true" className="mr-1 size-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Define project details, assign member roles, and invite teammates via SMTP.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              {createError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-sm text-emerald-500">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {createSuccess}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="proj-name">Project Name</Label>
                  <Input
                    id="proj-name"
                    required
                    placeholder="e.g. Core Engine"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!key) {
                        setKey(e.target.value.slice(0, 3).toUpperCase());
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="proj-key">Key</Label>
                  <Input
                    id="proj-key"
                    required
                    placeholder="ENG"
                    maxLength={6}
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Textarea
                  id="proj-desc"
                  placeholder="Goals, roadmap, and scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Roles & Teammates Invite section */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Teammates & Role Assignments (Sent via SMTP)
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <select
                    className="rounded-md border border-input bg-background px-2.5 py-1 text-sm"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as ProjectRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddMemberToList}>
                    Add
                  </Button>
                </div>

                {membersToInvite.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {membersToInvite.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                      >
                        {m.email}
                        <Badge variant="outline" className="px-1 text-[10px] leading-tight">
                          {m.role}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createPending}>
                  {createPending ? "Creating & Sending Emails…" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border/40 bg-card p-5 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project, define roles, and invite teammates via email."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col justify-between transition-all hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                    {project.key}
                  </Badge>
                  <Badge
                    variant={
                      project.status === "active"
                        ? "default"
                        : project.status === "completed"
                        ? "secondary"
                        : "outline"
                    }
                    className="capitalize text-xs"
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-lg font-semibold">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {project.description || "No description provided."}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-4 pt-0">
                {/* 0 to 100% Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Task Progress</span>
                    <span className="font-semibold text-primary">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{project.open_tasks} open tasks</span>
                    <span>{project.total_tasks} total</span>
                  </div>
                </div>

                {/* Members with Assigned Roles */}
                <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Users className="size-3.5" />
                      Team & Roles ({project.members.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-1.5"
                      onClick={() => setSelectedProjectForMember(project)}
                    >
                      + Role / Invite
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.members.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[11px]"
                      >
                        <span className="max-w-[100px] truncate">{m.user.first_name || m.user.email}</span>
                        <Badge
                          variant="secondary"
                          className="bg-background/80 px-1 py-0 text-[9px] font-semibold text-primary"
                        >
                          {m.role}
                        </Badge>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Assigning Member / Role to existing project */}
      <Dialog
        open={Boolean(selectedProjectForMember)}
        onOpenChange={(open) => !open && setSelectedProjectForMember(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role / Invite Member</DialogTitle>
            <DialogDescription>
              Assign a role in <strong>{selectedProjectForMember?.name}</strong>. If new, an SMTP email invite will be sent.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignMemberToProject} className="flex flex-col gap-3">
            {addMemberMsg && (
              <div className="rounded-md bg-secondary/60 p-2 text-xs font-medium text-primary">
                {addMemberMsg}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-email">Email Address</Label>
              <Input
                id="assign-email"
                type="email"
                required
                placeholder="colleague@domain.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-role">Assigned Role</Label>
              <select
                id="assign-role"
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addMemberPending}>
                {addMemberPending ? "Dispatching…" : "Assign & Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
