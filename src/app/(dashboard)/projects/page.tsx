import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/projects/components/project-card";
import { PROJECTS } from "@/lib/mock/projects";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Projects" description="Plan and track every workspace project">
        <Button asChild>
          <Link href="/projects">
            <Plus aria-hidden="true" />
            New project
          </Link>
        </Button>
      </PageHeader>

      {demo === "empty" ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project to get started."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
