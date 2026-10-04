import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunnerTable } from "@/components/dashboard/runner-table";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard";

export function RunnersView({ data }: { data: DashboardData }) {
  const available = data.runnerSource === "inventory";
  return <Card><CardHeader><div><CardTitle>Runner fleet</CardTitle><CardDescription>{available ? "Names, status, type, version, and last contact from the GitLab runner inventory." : "Runner visibility depends on the permissions granted by the GitLab instance."}</CardDescription></div><Badge tone={available ? "success" : "warning"}>{available ? `Full inventory · ${data.runnerCount}` : "Unavailable"}</Badge></CardHeader><CardContent className="flush-content"><RunnerTable data={data} /></CardContent></Card>;
}
