import { ShieldAlert } from "lucide-react";

import { EmptyState, formatDuration } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardData } from "@/lib/dashboard";

export function RunnerTable({ data }: { data: DashboardData }) {
  if (!data.runners.length) return <EmptyState icon={<ShieldAlert size={22} />} title="Runner inventory is unavailable" detail="GitLab does not expose the full runner inventory to this Reporter token. Project pipeline and job data remain available." />;
  return <Table><TableHeader><TableRow><TableHead>Runner</TableHead><TableHead>Status</TableHead><TableHead>Observed jobs</TableHead><TableHead>Success / failed</TableHead><TableHead>Avg duration</TableHead><TableHead>Version</TableHead></TableRow></TableHeader><TableBody>{data.runners.map((runner) => <TableRow key={runner.id}><TableCell><span className="cell-primary">{runner.description || `Runner #${runner.id}`}</span><span className="cell-secondary">{runner.runner_type || "Observed through job execution"}</span></TableCell><TableCell><Badge tone={runner.paused ? "warning" : runner.online || runner.status === "online" ? "success" : "danger"}>{runner.paused ? "paused" : runner.online || runner.status === "online" ? "online" : "offline"}</Badge></TableCell><TableCell>{runner.observedJobs || "—"}</TableCell><TableCell><span className="runner-outcome">{runner.successfulJobs} / {runner.failedJobs}</span></TableCell><TableCell>{formatDuration(runner.averageDurationSeconds)}</TableCell><TableCell>{runner.version || "—"}</TableCell></TableRow>)}</TableBody></Table>;
}
