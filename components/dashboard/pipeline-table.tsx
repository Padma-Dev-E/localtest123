import { ExternalLink, GitBranch } from "lucide-react";

import { EmptyState, formatDate, formatDuration, StatusBadge } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PipelineSummary } from "@/lib/dashboard";

export function PipelineTable({ pipelines, onSelect }: { pipelines: PipelineSummary[]; onSelect?: (pipeline: PipelineSummary) => void }) {
  if (!pipelines.length) return <EmptyState title="No pipelines in the selected window" detail="New pipeline runs will appear here when the configured GitLab token can read a project." />;
  return <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Ref</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Updated</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{pipelines.map((pipeline) => <TableRow key={`${pipeline.projectId}-${pipeline.id}`} className={onSelect ? "clickable-row" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={() => onSelect?.(pipeline)} onKeyDown={(event) => { if (onSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(pipeline); } }}><TableCell><span className="cell-primary">{pipeline.projectName.split("/").slice(-1)[0]} <span className="pipeline-number">#{pipeline.iid || pipeline.id}</span></span><span className="cell-secondary">{pipeline.projectName}</span></TableCell><TableCell><span className="ref-cell"><GitBranch size={14} />{pipeline.ref}{pipeline.source ? <Badge tone="neutral">{pipeline.source}</Badge> : null}</span></TableCell><TableCell><StatusBadge status={pipeline.status} /></TableCell><TableCell>{formatDuration(pipeline.duration)}</TableCell><TableCell>{formatDate(pipeline.updatedAt)}</TableCell><TableCell className="action-cell"><a className="icon-link" href={pipeline.webUrl} target="_blank" rel="noreferrer" title="Open pipeline" onClick={(event) => event.stopPropagation()}><ExternalLink size={16} /></a></TableCell></TableRow>)}</TableBody></Table>;
}
