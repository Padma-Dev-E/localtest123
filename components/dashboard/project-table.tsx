import { ExternalLink } from "lucide-react";

import { EmptyState, formatDate, StatusBadge } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectSummary } from "@/lib/dashboard";

export function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  if (!projects.length) return <EmptyState title="No projects visible" detail="The configured GitLab token does not currently expose any projects." />;
  return <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Latest pipeline</TableHead><TableHead>Issues</TableHead><TableHead>Visibility</TableHead><TableHead>Last activity</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{projects.map((project) => <TableRow key={project.id}><TableCell><span className="cell-primary">{project.name}</span><span className="cell-secondary">{project.path_with_namespace}</span></TableCell><TableCell>{project.latestPipeline ? <StatusBadge status={project.latestPipeline.status} /> : "—"}</TableCell><TableCell>{project.open_issues_count}</TableCell><TableCell><Badge tone="neutral">{project.visibility}</Badge></TableCell><TableCell>{formatDate(project.last_activity_at)}</TableCell><TableCell className="action-cell"><a className="icon-link" href={project.web_url} target="_blank" rel="noreferrer" title="Open project"><ExternalLink size={16} /></a></TableCell></TableRow>)}</TableBody></Table>;
}
