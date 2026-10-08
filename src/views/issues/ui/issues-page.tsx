"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  SearchX,
  User,
} from "lucide-react";
import {
  type ProjectDto,
  type ProjectRole,
  type TaskDto,
  type TaskPriority,
  type TaskStatus,
  createTask,
  listProjects,
  listWorkspaces,
  listWorkspaceTasks,
  updateTask,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
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

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const ROLES: ProjectRole[] = ["DEVELOPER", "LEAD", "VIEWER", "OWNER"];

export function IssuesPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // New Task Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [progress, setProgress] = useState<number>(0);
  const [roleRequired, setRoleRequired] = useState<ProjectRole>("DEVELOPER");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);

  // Edit Task Dialog State
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editRole, setEditRole] = useState<ProjectRole>("DEVELOPER");
  const [updatePending, setUpdatePending] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const wsList = await listWorkspaces();
        if (wsList.length > 0) {
          const ws = wsList[0];
          const [pList, tList] = await Promise.all([
            listProjects(ws.id),
            listWorkspaceTasks(ws.id),
          ]);
          setProjects(pList);
          setTasks(tList);
          if (pList.length > 0) {
            setSelectedProjectId(pList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load tasks", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setCreatePending(true);

    try {
      const created = await createTask(selectedProjectId, {
        title,
        description,
        status: taskStatus,
        priority: taskPriority,
        progress: Number(progress),
        role_required: roleRequired,
        assignee_id: assigneeId,
      });

      setTasks((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setProgress(0);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setCreatePending(false);
    }
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setUpdatePending(true);

    try {
      const updated = await updateTask(editingTask.id, {
        progress: Number(editProgress),
        status: editStatus,
        role_required: editRole,
      });

      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setUpdatePending(false);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesProject = projectFilter === "all" || task.project === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Issues & Tasks"
        description="Track tasks with completion percentage (0-100%) and assigned roles"
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={projects.length === 0}>
              <Plus aria-hidden="true" className="mr-1 size-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>
                Assign role requirements, teammates, and set progress from 0% to 100%.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-proj">Project</Label>
                <select
                  id="task-proj"
                  className="rounded-md border border-input bg-background p-2 text-sm"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  required
                  placeholder="e.g. Implement authentication middleware"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Details, steps, and acceptance criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Progress 0 to 100% */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-progress" className="font-semibold text-xs uppercase tracking-wide">
                    Progress Percentage: {progress}%
                  </Label>
                  <span className="text-xs font-mono font-medium text-primary">{progress}%</span>
                </div>
                <input
                  id="task-progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setProgress(val);
                    if (val === 100) setTaskStatus("done");
                    else if (val > 0 && taskStatus === "todo") setTaskStatus("in-progress");
                  }}
                  className="mt-2 w-full accent-primary cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0% (Not Started)</span>
                  <span>50% (In Flight)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-status">Status</Label>
                  <select
                    id="task-status"
                    className="rounded-md border border-input bg-background p-2 text-sm"
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-priority">Priority</Label>
                  <select
                    id="task-priority"
                    className="rounded-md border border-input bg-background p-2 text-sm"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr.value} value={pr.value}>
                        {pr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Required & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-role">Required Role</Label>
                  <select
                    id="task-role"
                    className="rounded-md border border-input bg-background p-2 text-sm"
                    value={roleRequired}
                    onChange={(e) => setRoleRequired(e.target.value as ProjectRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-assignee">Assignee</Label>
                  <select
                    id="task-assignee"
                    className="rounded-md border border-input bg-background p-2 text-sm"
                    value={assigneeId ?? ""}
                    onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Unassigned</option>
                    {currentProject?.members.map((m) => (
                      <option key={m.id} value={m.user.id}>
                        {m.user.first_name || m.user.email} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createPending}>
                  {createPending ? "Saving…" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        <select
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key} - {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg border border-border/40 bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No tasks found"
          description={
            projects.length === 0
              ? "First create a project in the Projects tab."
              : "Create your first task or adjust your search filters."
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card shadow-sm">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setEditingTask(task);
                setEditProgress(task.progress);
                setEditStatus(task.status);
                setEditRole(task.role_required);
              }}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px] font-bold">
                    {task.project_key}
                  </Badge>
                  <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
                  <Badge
                    variant={
                      task.status === "done"
                        ? "default"
                        : task.status === "in-progress"
                        ? "secondary"
                        : "outline"
                    }
                    className="capitalize text-[10px] px-1.5 py-0"
                  >
                    {task.status.replace("-", " ")}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                )}
              </div>

              {/* Progress 0-100% and Roles */}
              <div className="flex items-center gap-6 sm:w-80 justify-between">
                {/* 0 to 100% Progress Indicator */}
                <div className="flex flex-col gap-1 w-36">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-semibold text-primary">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} />
                </div>

                {/* Role and Assignee */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold"
                  >
                    {task.role_required}
                  </Badge>
                  {task.assignee ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-3" />
                      <span className="max-w-[70px] truncate">
                        {task.assignee.first_name || task.assignee.email.split("@")[0]}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60 italic">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Dialog: Adjust progress 0-100% & Role */}
      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Task Progress & Role</DialogTitle>
            <DialogDescription>{editingTask?.title}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
            {/* 0 to 100% Progress Adjustment Slider */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-progress" className="font-semibold text-xs uppercase tracking-wide">
                  Progress Percentage
                </Label>
                <span className="text-sm font-mono font-bold text-primary">{editProgress}%</span>
              </div>
              <input
                id="edit-progress"
                type="range"
                min="0"
                max="100"
                step="5"
                value={editProgress}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditProgress(val);
                  if (val === 100) setEditStatus("done");
                  else if (val > 0 && editStatus === "todo") setEditStatus("in-progress");
                }}
                className="mt-3 w-full accent-primary cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  className="rounded-md border border-input bg-background p-2 text-sm"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  className="rounded-md border border-input bg-background p-2 text-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as ProjectRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={updatePending}>
                {updatePending ? "Updating…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
