import { ExternalLink } from "lucide-react";

import { EmptyState, formatDuration, StatusBadge } from "@/components/dashboard/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobSummary } from "@/lib/dashboard";

export function JobTable({ jobs }: { jobs: JobSummary[] }) {
  if (!jobs.length) return <EmptyState title="No job details available" detail="Job data is collected from the latest pipeline for each visible project." />;
  return <Table><TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Project</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Runner</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{jobs.slice(0, 50).map((job) => <TableRow key={`${job.projectId}-${job.id}`}><TableCell><span className="cell-primary">{job.name}</span></TableCell><TableCell><span className="cell-secondary">{job.projectName}</span></TableCell><TableCell>{job.stage}</TableCell><TableCell><StatusBadge status={job.status} /></TableCell><TableCell>{formatDuration(job.duration)}</TableCell><TableCell>{job.runner?.description || "Unassigned"}</TableCell><TableCell className="action-cell">{job.web_url ? <a className="icon-link" href={job.web_url} target="_blank" rel="noreferrer" title="Open job"><ExternalLink size={16} /></a> : "—"}</TableCell></TableRow>)}</TableBody></Table>;
}
