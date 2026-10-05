import { FolderKanban } from "lucide-react";

import { EmptyState, formatDate, StatusBadge } from "@/components/dashboard/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectSummary } from "@/lib/dashboard";

export function ProjectHealthWidget({ projects }: { projects: ProjectSummary[] }) {
  const items = projects.filter((project) => !project.latestPipeline || project.latestPipeline.status === "failed").slice(0, 6);
  return <Card><CardHeader><CardTitle><FolderKanban size={16} />Project health</CardTitle><CardDescription>Projects with no recent run or a failed latest pipeline</CardDescription></CardHeader><CardContent>{items.length ? <div className="widget-list">{items.map((project) => <div className="widget-row" key={project.id}><div className="widget-row-copy"><strong>{project.name}</strong><span>{project.latestPipeline ? `Last run ${formatDate(project.latestPipeline.updatedAt)}` : "No pipeline in this view"}</span></div>{project.latestPipeline ? <StatusBadge status={project.latestPipeline.status} /> : <span className="widget-muted">No run</span>}</div>)}</div> : <EmptyState icon={<FolderKanban size={22} />} title="Projects look healthy" detail="No visible project needs attention in this window." />}</CardContent></Card>;
}
