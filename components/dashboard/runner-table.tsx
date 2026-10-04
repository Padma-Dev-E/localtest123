import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardData } from "@/lib/dashboard";

export function RunnerTable({ data }: { data: DashboardData }) {
  if (!data.runners.length) return <EmptyState icon={<ShieldAlert size={22} />} title="Runner inventory is unavailable" detail="GitLab did not expose runner inventory to this token. Pipeline and job data remain available." />;
  return <Table><TableHeader><TableRow><TableHead>Runner</TableHead><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Version</TableHead><TableHead>Last contact</TableHead></TableRow></TableHeader><TableBody>{data.runners.map((runner) => <TableRow key={runner.id}><TableCell><span className="cell-primary">{runner.description || `Runner #${runner.id}`}</span><span className="cell-secondary">Runner #{runner.id}</span></TableCell><TableCell><Badge tone={runner.paused ? "warning" : runner.online || runner.status === "online" ? "success" : "danger"}>{runner.paused ? "paused" : runner.online || runner.status === "online" ? "online" : "offline"}</Badge></TableCell><TableCell>{runner.runner_type || "—"}</TableCell><TableCell>{runner.version || "—"}</TableCell><TableCell>{runner.contacted_at ? new Date(runner.contacted_at).toLocaleString() : "—"}</TableCell></TableRow>)}</TableBody></Table>;
}
