import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunnerTable } from "@/components/dashboard/runner-table";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/dashboard";

export function RunnersView({ data }: { data: DashboardData }) {
  const observed = data.runnerSource === "job_observed";
  return <Card><CardHeader><div><CardTitle>Runner fleet</CardTitle><CardDescription>{observed ? "Observed from readable job executions; full runner inventory requires the appropriate GitLab role." : "Runner visibility comes from the permissions granted by the GitLab instance."}</CardDescription></div><Badge tone={observed ? "warning" : "success"}>{observed ? "Observed via jobs" : "Full inventory"}</Badge></CardHeader><CardContent className="flush-content"><RunnerTable data={data} /></CardContent></Card>;
}
