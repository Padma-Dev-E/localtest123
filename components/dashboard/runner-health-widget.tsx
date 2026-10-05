import { Server } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/shared";
import type { RunnerSummary } from "@/lib/dashboard";

export function RunnerHealthWidget({ runners }: { runners: RunnerSummary[] }) {
  const online = runners.filter((runner) => runner.online || runner.status === "online").length;
  const paused = runners.filter((runner) => runner.paused).length;
  const offline = Math.max(0, runners.length - online - paused);
  return <Card><CardHeader><CardTitle><Server size={16} />Runner health</CardTitle><CardDescription>Current inventory status from GitLab</CardDescription></CardHeader><CardContent>{runners.length ? <div className="health-summary"><div><strong>{online}</strong><span>Online</span></div><div><strong>{offline}</strong><span>Offline</span></div><div><strong>{paused}</strong><span>Paused</span></div><Badge tone={offline ? "danger" : "success"}>{offline ? "Needs attention" : "Healthy fleet"}</Badge></div> : <EmptyState icon={<Server size={22} />} title="Runner inventory unavailable" detail="The configured GitLab token did not expose runner inventory." />}</CardContent></Card>;
}
