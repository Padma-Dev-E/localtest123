import { FolderTree } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/shared";
import type { GitLabProject, GroupSummary, PipelineSummary } from "@/lib/dashboard";

export function GroupHealthWidget({ groups, projects, pipelines }: { groups: GroupSummary[]; projects: GitLabProject[]; pipelines: PipelineSummary[] }) {
  const rows = groups.map((group) => {
    const groupProjects = projects.filter((project) => project.namespace?.id === group.id || project.namespace?.full_path?.startsWith(`${group.full_path}/`) || project.namespace?.full_path === group.full_path || project.path_with_namespace.startsWith(`${group.full_path}/`));
    const groupProjectIds = new Set(groupProjects.map((project) => project.id));
    const groupPipelines = pipelines.filter((pipeline) => groupProjectIds.has(pipeline.projectId));
    const completed = groupPipelines.filter((pipeline) => ["success", "failed", "canceled", "skipped"].includes(pipeline.status));
    const successful = completed.filter((pipeline) => pipeline.status === "success").length;
    return { group, projectCount: groupProjects.length, pipelineCount: groupPipelines.length, failed: groupPipelines.filter((pipeline) => pipeline.status === "failed").length, successRate: completed.length ? Math.round((successful / completed.length) * 100) : null };
  }).filter((row) => row.projectCount > 0).sort((a, b) => b.failed - a.failed || b.projectCount - a.projectCount).slice(0, 6);

  return <Card><CardHeader><CardTitle><FolderTree size={16} />Group health</CardTitle><CardDescription>Project and pipeline health by visible group</CardDescription></CardHeader><CardContent>{rows.length ? <div className="widget-list">{rows.map(({ group, projectCount, pipelineCount, failed, successRate }) => <div className="widget-row" key={group.id}><div className="widget-row-copy"><strong>{group.full_path}</strong><span>{projectCount} projects · {pipelineCount} pipelines</span></div><Badge tone={failed ? "danger" : "success"}>{failed ? `${failed} failed` : successRate === null ? "No completed runs" : `${successRate}% success`}</Badge></div>)}</div> : <EmptyState icon={<FolderTree size={22} />} title="No group data" detail="Groups will appear when the configured GitLab identity can read them." />}</CardContent></Card>;
}
