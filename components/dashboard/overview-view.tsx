import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Layers3, PlayCircle, Server, XCircle } from "lucide-react";

import { PipelineTable } from "@/components/dashboard/pipeline-table";
import { formatPercent, MetricCard } from "@/components/dashboard/shared";
import { PipelineTrend } from "@/components/charts/pipeline-trend";
import { StatusDonut } from "@/components/charts/status-donut";
import { ActionRequiredWidget } from "@/components/dashboard/action-required-widget";
import { GroupHealthWidget } from "@/components/dashboard/group-health-widget";
import { ProjectHealthWidget } from "@/components/dashboard/project-health-widget";
import { RunnerHealthWidget } from "@/components/dashboard/runner-health-widget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, GroupSummary, MetricBreakdown, PipelineSummary } from "@/lib/dashboard";

export function OverviewView({ data, groups, onViewPipelines, onSelectPipeline }: { data: DashboardData; groups: GroupSummary[]; onViewPipelines: () => void; onSelectPipeline: (pipeline: PipelineSummary) => void }) {
  const pipelineScope = data.pipelineStats?.scope === "instance" && data.pipelineStats.complete
    ? "Complete instance scope"
    : data.pipelineStats?.scope === "project" && data.pipelineStats.complete
      ? "Complete project scope"
      : data.pipelineStats?.scope === "authenticated-user"
        ? "Authenticated-user scope"
      : "Partial pipeline scope";
  return <><div className="metric-grid"><MetricCard label="Projects" value={data.projectCount} detail={`${data.projects.length} shown on this page`} icon={Layers3} tone="blue" /><MetricCard label="Pipelines" value={data.metrics.totalPipelines} detail={`${data.metrics.successfulPipelines} successful · ${data.metrics.failedPipelines} failed`} icon={CheckCircle2} tone="teal" /><MetricCard label="Success rate" value={formatPercent(data.metrics.successRate)} detail={pipelineScope} icon={CheckCircle2} tone="teal" /><MetricCard label="Running" value={data.metrics.runningPipelines} detail="Active pipeline runs" icon={PlayCircle} tone="amber" /><MetricCard label="Failed" value={data.metrics.failedPipelines} detail="Needs investigation" icon={XCircle} tone="rose" /><MetricCard label="Runners online" value={data.metrics.visibleRunners} detail={`${data.runnerCount} in inventory`} icon={Server} tone="blue" /></div><div className="chart-grid"><Card><CardHeader><CardTitle>Pipeline throughput</CardTitle><CardDescription>Runs and outcomes in the selected window</CardDescription></CardHeader><CardContent><PipelineTrend pipelines={data.pipelines} trend={data.pipelineStats?.trend} /></CardContent></Card><Card><CardHeader><CardTitle>Outcome mix</CardTitle><CardDescription>Status distribution for the selected scope</CardDescription></CardHeader><CardContent><StatusDonut pipelines={data.pipelines} statusCounts={data.pipelineStats?.statusCounts} /></CardContent></Card></div><div className="dashboard-widget-grid"><GroupHealthWidget groups={groups} projects={data.projects} pipelines={data.pipelines} /><ActionRequiredWidget pipelines={data.pipelines} /></div><div className="dashboard-widget-grid"><ProjectHealthWidget projects={data.projects} /><RunnerHealthWidget runners={data.runners} /></div><div className="lower-grid"><BreakdownCard title="Failure reasons" description="Open a failed pipeline for job-level reasons" icon={<CircleAlert size={16} />} items={data.metrics.failureReasons} empty="Failure reasons load when a pipeline is opened." /><BreakdownCard title="Failed stages" description="Stages containing failed jobs" icon={<Clock3 size={16} />} items={data.metrics.failedStages} empty="Failed stages load when a pipeline is opened." /></div><Card><CardHeader className="table-card-header"><div><CardTitle>Latest pipelines</CardTitle><CardDescription>Click a row for job-level failure diagnostics</CardDescription></div><button className="text-link text-link-button" type="button" onClick={onViewPipelines}>View all <ArrowUpRight size={15} /></button></CardHeader><CardContent className="flush-content"><PipelineTable pipelines={data.pipelines} onSelect={onSelectPipeline} /></CardContent></Card></>;
}

function BreakdownCard({ title, description, icon, items, empty }: { title: string; description: string; icon: React.ReactNode; items: MetricBreakdown[]; empty: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{items.length ? <div className="breakdown-list">{items.map((item) => <div className="breakdown-item" key={item.name}><span><span className="breakdown-name">{item.name.replaceAll("_", " ")}</span><span className="breakdown-bar"><span style={{ width: `${Math.min(100, item.count * 100 / Math.max(...items.map((entry) => entry.count))) || 0}%` }} /></span></span><strong>{item.count}</strong></div>)}</div> : <p className="breakdown-empty">{empty}</p>}</CardContent></Card>;
}
