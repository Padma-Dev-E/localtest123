"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileArchive,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  Layers3,
  ListChecks,
  RefreshCw,
  Server,
  ShieldAlert,
  TestTube2,
  TriangleAlert,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DurationBar } from "@/components/charts/duration-bar";
import { PipelineTrend } from "@/components/charts/pipeline-trend";
import { StatusDonut } from "@/components/charts/status-donut";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { explainFailureReason } from "@/lib/dashboard";
import type { ActivityItem, DashboardData, JobSummary, PipelineDetail, PipelineJobDetail, PipelineStats, PipelineSummary, ProjectSummary } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type View = "overview" | "pipelines" | "projects" | "runners";

const views: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipelines", label: "Pipelines", icon: ListChecks },
  { id: "projects", label: "Projects", icon: Layers3 },
  { id: "runners", label: "Runners", icon: Server },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 1) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status: string): "neutral" | "success" | "danger" | "warning" | "info" {
  if (status === "success") return "success";
  if (["failed", "canceled"].includes(status)) return "danger";
  if (["running", "pending", "created", "waiting_for_resource"].includes(status)) return "warning";
  if (status === "skipped") return "info";
  return "neutral";
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "success" ? CheckCircle2 : status === "failed" ? XCircle : status === "running" ? Activity : Clock3;
  return <Badge tone={statusTone(status)} className="status-badge"><Icon size={13} aria-hidden="true" />{status.replaceAll("_", " ")}</Badge>;
}

function MetricCard({ label, value, detail, icon: Icon, tone = "teal" }: { label: string; value: string | number; detail: string; icon: typeof Activity; tone?: "teal" | "rose" | "amber" | "blue" }) {
  return <Card className="metric-card"><CardContent><div className={cn("metric-icon", `metric-icon-${tone}`)}><Icon size={17} aria-hidden="true" /></div><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></div></CardContent></Card>;
}

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "merge_request") return <GitMerge size={16} aria-hidden="true" />;
  if (kind === "issue") return <TriangleAlert size={16} aria-hidden="true" />;
  return <GitCommitHorizontal size={16} aria-hidden="true" />;
}

function PipelineTable({ pipelines, onSelect }: { pipelines: PipelineSummary[]; onSelect?: (pipeline: PipelineSummary) => void }) {
  if (!pipelines.length) return <EmptyState title="No pipelines in this window" detail="Pipeline history will appear here when the configured Reporter token can read a project." />;
  return <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Ref</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Updated</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{pipelines.slice(0, 40).map((pipeline) => <TableRow key={`${pipeline.projectId}-${pipeline.id}`} className={onSelect ? "clickable-row" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={() => onSelect?.(pipeline)} onKeyDown={(event) => { if (onSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(pipeline); } }}><TableCell><span className="cell-primary">{pipeline.projectName.split("/").slice(-1)[0]} <span className="pipeline-number">#{pipeline.iid || pipeline.id}</span></span><span className="cell-secondary">{pipeline.projectName}</span></TableCell><TableCell><span className="ref-cell"><GitBranch size={14} />{pipeline.ref}{pipeline.source ? <Badge tone="neutral">{pipeline.source}</Badge> : null}</span></TableCell><TableCell><StatusBadge status={pipeline.status} /></TableCell><TableCell>{formatDuration(pipeline.duration)}</TableCell><TableCell>{formatDate(pipeline.updatedAt)}</TableCell><TableCell className="action-cell"><a className="icon-link" href={pipeline.webUrl} target="_blank" rel="noreferrer" title="Open pipeline" onClick={(event) => event.stopPropagation()}><ExternalLink size={16} /></a></TableCell></TableRow>)}</TableBody></Table>;
}

function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  if (!projects.length) return <EmptyState title="No projects visible" detail="The GitLab token does not currently expose any projects at Reporter level." />;
  return <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Latest pipeline</TableHead><TableHead>Issues</TableHead><TableHead>Visibility</TableHead><TableHead>Last activity</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{projects.map((project) => <TableRow key={project.id}><TableCell><span className="cell-primary">{project.name}</span><span className="cell-secondary">{project.path_with_namespace}</span></TableCell><TableCell>{project.latestPipeline ? <StatusBadge status={project.latestPipeline.status} /> : "—"}</TableCell><TableCell>{project.open_issues_count}</TableCell><TableCell><Badge tone="neutral">{project.visibility}</Badge></TableCell><TableCell>{formatDate(project.last_activity_at)}</TableCell><TableCell className="action-cell"><a className="icon-link" href={project.web_url} target="_blank" rel="noreferrer" title="Open project"><ExternalLink size={16} /></a></TableCell></TableRow>)}</TableBody></Table>;
}

function JobTable({ jobs }: { jobs: JobSummary[] }) {
  if (!jobs.length) return <EmptyState title="No job details available" detail="Job data is collected from the latest pipeline for each visible project." />;
  return <Table><TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Project</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Runner</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>{jobs.slice(0, 50).map((job) => <TableRow key={`${job.projectId}-${job.id}`}><TableCell><span className="cell-primary">{job.name}</span></TableCell><TableCell><span className="cell-secondary">{job.projectName}</span></TableCell><TableCell>{job.stage}</TableCell><TableCell><StatusBadge status={job.status} /></TableCell><TableCell>{formatDuration(job.duration)}</TableCell><TableCell>{job.runner?.description || "Unassigned"}</TableCell><TableCell className="action-cell">{job.web_url ? <a className="icon-link" href={job.web_url} target="_blank" rel="noreferrer" title="Open job"><ExternalLink size={16} /></a> : "—"}</TableCell></TableRow>)}</TableBody></Table>;
}

function RunnerTable({ data }: { data: DashboardData }) {
  if (!data.runners.length) return <EmptyState icon={<ShieldAlert size={22} />} title="Runner inventory is unavailable" detail="GitLab does not expose the full runner inventory to this Reporter token. Project pipeline and job data remain available." />;
  return <Table><TableHeader><TableRow><TableHead>Runner</TableHead><TableHead>Status</TableHead><TableHead>Observed jobs</TableHead><TableHead>Success / failed</TableHead><TableHead>Avg duration</TableHead><TableHead>Version</TableHead></TableRow></TableHeader><TableBody>{data.runners.map((runner) => <TableRow key={runner.id}><TableCell><span className="cell-primary">{runner.description || `Runner #${runner.id}`}</span><span className="cell-secondary">{runner.runner_type || "Observed through job execution"}</span></TableCell><TableCell><Badge tone={runner.paused ? "warning" : runner.online || runner.status === "online" ? "success" : "danger"}>{runner.paused ? "paused" : runner.online || runner.status === "online" ? "online" : "offline"}</Badge></TableCell><TableCell>{runner.observedJobs || "—"}</TableCell><TableCell><span className="runner-outcome">{runner.successfulJobs} / {runner.failedJobs}</span></TableCell><TableCell>{formatDuration(runner.averageDurationSeconds)}</TableCell><TableCell>{runner.version || "—"}</TableCell></TableRow>)}</TableBody></Table>;
}

function EmptyState({ title, detail, icon = <AlertTriangle size={22} /> }: { title: string; detail: string; icon?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{detail}</p></div>;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [view, setView] = useState<View>("overview");
  const [days, setDays] = useState("30");
  const [project, setProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineSummary | null>(null);
  const [pipelineDetail, setPipelineDetail] = useState<PipelineDetail | null>(null);
  const [pipelineDetailLoading, setPipelineDetailLoading] = useState(false);
  const [pipelineDetailError, setPipelineDetailError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ days, ...(project !== "all" ? { project } : {}) });
      const response = await fetch(`/api/dashboard?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as DashboardData;
      if (!response.ok && !payload.warnings?.length) throw new Error("Dashboard request failed");
      setData(payload);
      setLastRefresh(new Date().toISOString());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard request failed");
    } finally {
      setLoading(false);
    }
  }, [days, project]);

  useEffect(() => { void loadData(); }, [loadData]);

  const openPipeline = useCallback(async (pipeline: PipelineSummary) => {
    setSelectedPipeline(pipeline);
    setPipelineDetail(null);
    setPipelineDetailError(null);
    setPipelineDetailLoading(true);
    try {
      const response = await fetch(`/api/pipelines/${pipeline.projectId}/${pipeline.id}`, { cache: "no-store" });
      const payload = await response.json() as PipelineDetail | { error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Pipeline details could not be loaded");
      setPipelineDetail(payload as PipelineDetail);
    } catch (requestError) {
      setPipelineDetailError(requestError instanceof Error ? requestError.message : "Pipeline details could not be loaded");
    } finally {
      setPipelineDetailLoading(false);
    }
  }, []);

  const selectedProjectName = useMemo(() => data?.projects.find((item) => String(item.id) === project)?.name, [data, project]);
  const title = view === "overview" ? "Delivery overview" : view === "pipelines" ? "Pipeline operations" : view === "projects" ? "Project inventory" : "Runner fleet";

  return <main className="ops-shell">
    <header className="ops-header page-width"><div className="brand-lockup"><div className="brand-mark"><GitLabMark /></div><div><p className="eyebrow">Engineering control room</p><h1>GitLab Operations</h1></div></div><div className="header-actions"><Badge tone="info"><ShieldAlert size={13} /> Reporter access</Badge><Badge tone="warning">Temporary public surface</Badge><Button variant="outline" size="icon" onClick={() => void loadData()} disabled={loading} title="Refresh data" aria-label="Refresh data"><RefreshCw size={17} className={loading ? "spin" : ""} /></Button></div></header>
    <section className="page-width intro-row"><div><p className="section-kicker">{selectedProjectName || "All visible projects"}</p><h2>{title}</h2><p className="section-description">Read-only delivery intelligence across pipelines, jobs, environments, deployments, and recent engineering activity.</p></div><div className="refresh-meta"><CalendarDays size={15} />{lastRefresh ? `Updated ${formatDate(lastRefresh)}` : "Waiting for data"}</div></section>
    <section className="page-width control-row" aria-label="Dashboard filters"><div className="view-tabs">{views.map(({ id, label, icon: Icon }) => <button key={id} className={cn("view-tab", view === id && "view-tab-active")} onClick={() => setView(id)}><Icon size={15} />{label}</button>)}</div><div className="filter-controls"><label>Window<Select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select></label><label>Project<Select value={project} onChange={(event) => setProject(event.target.value)}><option value="all">All projects</option>{data?.projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label></div></section>
    <section className="page-width dashboard-content">{error && <Alert tone="danger"><XCircle size={17} /><div><strong>Unable to refresh dashboard</strong><span>{error}</span></div></Alert>}{data?.warnings.map((warning) => <Alert key={warning} tone={warning.toLowerCase().includes("unavailable") ? "warning" : "info"}><AlertTriangle size={17} /><span>{warning}</span></Alert>)}{loading && !data ? <div className="loading-panel"><RefreshCw className="spin" size={24} /><span>Reading GitLab telemetry...</span></div> : data && view === "overview" ? <Overview data={data} onViewPipelines={() => setView("pipelines")} onSelectPipeline={openPipeline} /> : data && view === "pipelines" ? <PipelineView data={data} onSelectPipeline={openPipeline} /> : data && view === "projects" ? <ProjectView data={data} /> : data ? <RunnerView data={data} /> : null}</section>
    {selectedPipeline ? <PipelineDrawer pipeline={selectedPipeline} detail={pipelineDetail} loading={pipelineDetailLoading} error={pipelineDetailError} onClose={() => { setSelectedPipeline(null); setPipelineDetail(null); }} /> : null}
    <footer className="page-width ops-footer"><span>Source: GitLab API</span><span>Server-side token · no GitLab credentials in the browser</span></footer>
  </main>;
}

function Overview({ data, onViewPipelines, onSelectPipeline }: { data: DashboardData; onViewPipelines: () => void; onSelectPipeline: (pipeline: PipelineSummary) => void }) {
  return <><div className="metric-grid"><MetricCard label="Visible projects" value={data.projects.length} detail="Reporter-readable projects" icon={Layers3} tone="blue" /><MetricCard label="Pipeline success" value={formatPercent(data.metrics.successRate)} detail={`${data.metrics.successfulPipelines} successful of ${data.metrics.totalPipelines} runs`} icon={CheckCircle2} tone="teal" /><MetricCard label="Failed pipelines" value={data.metrics.failedPipelines} detail="In the selected time window" icon={XCircle} tone="rose" /><MetricCard label="Active environments" value={data.metrics.activeEnvironments} detail="Currently available targets" icon={Server} tone="amber" /></div><div className="chart-grid"><Card><CardHeader><CardTitle>Pipeline throughput</CardTitle><CardDescription>Run volume and outcomes by day</CardDescription></CardHeader><CardContent><PipelineTrend pipelines={data.pipelines} /></CardContent></Card><Card><CardHeader><CardTitle>Outcome mix</CardTitle><CardDescription>All pipeline states in the window</CardDescription></CardHeader><CardContent><StatusDonut pipelines={data.pipelines} /></CardContent></Card></div><div className="lower-grid"><Card><CardHeader><CardTitle>Average duration by project</CardTitle><CardDescription>Where delivery time is being spent</CardDescription></CardHeader><CardContent><DurationBar pipelines={data.pipelines} /></CardContent></Card><Card><CardHeader><CardTitle>Recent engineering activity</CardTitle><CardDescription>Open work and latest commits visible to this token</CardDescription></CardHeader><CardContent><ActivityFeed activity={data.activity} /></CardContent></Card></div><Card><CardHeader className="table-card-header"><div><CardTitle>Latest pipelines</CardTitle><CardDescription>The most recent delivery signals across visible projects</CardDescription></div><button className="text-link text-link-button" type="button" onClick={onViewPipelines}>View all <ArrowUpRight size={15} /></button></CardHeader><CardContent className="flush-content"><PipelineTable pipelines={data.pipelines} onSelect={onSelectPipeline} /></CardContent></Card></>;
}

function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (!activity.length) return <EmptyState title="No recent activity" detail="Merge requests, issues, and commits will appear here." />;
  return <div className="activity-feed">{activity.slice(0, 8).map((item, index) => <a className="activity-item" href={item.webUrl} target="_blank" rel="noreferrer" key={`${item.webUrl}-${index}`}><span className={cn("activity-icon", `activity-${item.kind}`)}><ActivityIcon kind={item.kind} /></span><span className="activity-copy"><strong>{item.title}</strong><span>{item.projectName} · {item.actor}</span></span><time>{formatDate(item.updatedAt)}</time></a>)}</div>;
}

function PipelineView({ data, onSelectPipeline }: { data: DashboardData; onSelectPipeline: (pipeline: PipelineSummary) => void }) { return <div className="stacked-view"><Card><CardHeader><CardTitle>Pipeline history</CardTitle><CardDescription>{data.pipelines.length} runs in the last {data.windowDays} days, with direct links back to GitLab. Select a row for diagnostics.</CardDescription></CardHeader><CardContent className="flush-content"><PipelineTable pipelines={data.pipelines} onSelect={onSelectPipeline} /></CardContent></Card><Card><CardHeader><CardTitle>Execution jobs</CardTitle><CardDescription>{data.jobs.length} jobs collected from the latest pipeline for each visible project.</CardDescription></CardHeader><CardContent className="flush-content"><JobTable jobs={data.jobs} /></CardContent></Card></div>; }
function ProjectView({ data }: { data: DashboardData }) { return <Card><CardHeader><CardTitle>Project inventory</CardTitle><CardDescription>Projects available to the configured read-only GitLab identity.</CardDescription></CardHeader><CardContent className="flush-content"><ProjectTable projects={data.projects} /></CardContent></Card>; }
function RunnerView({ data }: { data: DashboardData }) { return <Card><CardHeader><div><CardTitle>Runner fleet</CardTitle><CardDescription>{data.runnerSource === "job_observed" ? "Observed from Reporter-readable job executions; full runner inventory requires elevated GitLab permission." : "Runner visibility depends on the permissions granted by the upstream GitLab instance."}</CardDescription></div><Badge tone={data.runnerSource === "job_observed" ? "warning" : "success"}>{data.runnerSource === "job_observed" ? "Observed via jobs" : "Full inventory"}</Badge></CardHeader><CardContent className="flush-content"><RunnerTable data={data} /></CardContent></Card>; }

function DetailStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return <div className="detail-stat"><Icon size={15} aria-hidden="true" /><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function PipelineDrawer({ pipeline, detail, loading, error, onClose }: { pipeline: PipelineSummary; detail: PipelineDetail | null; loading: boolean; error: string | null; onClose: () => void }) {
  const displayPipeline = detail?.pipeline || pipeline;
  const stats: PipelineStats | null = detail?.stats || null;
  const failedJobs = detail?.jobs.filter((job) => job.status === "failed") || [];
  const testSummary = detail?.testReportSummary;
  const testTotals = testSummary && typeof testSummary.total === "object" ? testSummary.total : null;
  const testTotal = testTotals?.count ?? (typeof testSummary?.total === "number" ? testSummary.total : testSummary?.total_count) ?? 0;
  const testFailed = testTotals?.failed ?? testSummary?.failed ?? testSummary?.error ?? 0;
  return <div className="pipeline-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="pipeline-drawer" role="dialog" aria-modal="true" aria-label="Pipeline diagnostics">
      <header className="drawer-header"><div><p className="eyebrow">Pipeline diagnostics</p><h2>{displayPipeline.projectName} <span>#{displayPipeline.iid || displayPipeline.id}</span></h2><div className="drawer-subtitle"><StatusBadge status={displayPipeline.status} /><span>{displayPipeline.ref}</span>{displayPipeline.source ? <Badge tone="neutral">{displayPipeline.source}</Badge> : null}</div></div><div className="drawer-actions"><a className="icon-link" href={displayPipeline.webUrl} target="_blank" rel="noreferrer" title="Open in GitLab"><ExternalLink size={17} /></a><button className="drawer-close" type="button" onClick={onClose} title="Close details" aria-label="Close details"><X size={19} /></button></div></header>
      {loading ? <div className="loading-panel drawer-loading"><RefreshCw className="spin" size={23} /><span>Reading pipeline jobs and reports...</span></div> : error ? <Alert tone="danger"><XCircle size={17} /><span>{error}</span></Alert> : detail ? <div className="drawer-content">
        <section className="detail-stat-grid"><DetailStat label="Pipeline duration" value={formatDuration(displayPipeline.duration)} icon={Clock3} /><DetailStat label="Queue time" value={formatDuration(displayPipeline.queuedDuration)} icon={Clock3} /><DetailStat label="Jobs" value={stats?.totalJobs || 0} icon={Workflow} /><DetailStat label="Failed" value={stats?.failedJobs || 0} icon={XCircle} /><DetailStat label="Retries" value={stats?.retries || 0} icon={RefreshCw} /><DetailStat label="Artifacts" value={stats ? `${stats.artifactCount} · ${formatBytes(stats.artifactBytes)}` : "0"} icon={FileArchive} /><DetailStat label="Tests" value={testTotal || "—"} icon={TestTube2} /><DetailStat label="Coverage" value={typeof displayPipeline.coverage === "number" ? `${displayPipeline.coverage}%` : "—"} icon={GitPullRequest} /></section>
        <DetailSection title="Run context" icon={<GitBranch size={16} />}><div className="detail-grid"><DetailField label="Created" value={formatDate(displayPipeline.createdAt)} /><DetailField label="Started" value={formatDate(displayPipeline.startedAt)} /><DetailField label="Finished" value={formatDate(displayPipeline.finishedAt)} /><DetailField label="Triggered by" value={displayPipeline.user?.name || displayPipeline.user?.username || "Unknown"} /><DetailField label={displayPipeline.tag ? "Tag" : "Branch"} value={displayPipeline.ref} /><DetailField label="Commit" value={<span className="hash-value">{displayPipeline.sha ? displayPipeline.sha.slice(0, 12) : "Unknown"}</span>} /></div>{displayPipeline.yamlErrors ? <div className="yaml-error"><strong>Configuration error</strong><span>{displayPipeline.yamlErrors}</span></div> : null}</DetailSection>
        {failedJobs.length ? <DetailSection title="Failure analysis" icon={<ShieldAlert size={16} />} tone="danger"><div className="failure-list">{failedJobs.map((job) => <FailureItem job={job} key={job.id} />)}</div><p className="safe-note">Job traces are kept in GitLab and are not proxied through this public dashboard. Use the job links above to inspect logs with your GitLab permissions.</p></DetailSection> : null}
        <DetailSection title="Job execution" icon={<Workflow size={16} />}><div className="job-detail-list">{detail.jobs.map((job) => <JobDetailRow job={job} key={job.id} />)}</div></DetailSection>
        {testTotal ? <DetailSection title="Test report" icon={<TestTube2 size={16} />}><div className="test-summary"><span><strong>{testTotal}</strong> total</span><span className="test-success"><strong>{testTotals?.success ?? testSummary?.success ?? 0}</strong> passed</span><span className="test-failure"><strong>{testFailed}</strong> failed</span><span><strong>{testTotals?.skipped ?? testSummary?.skipped ?? 0}</strong> skipped</span><span><strong>{formatDuration(testTotals?.time ?? testSummary?.total_time)}</strong> runtime</span></div></DetailSection> : null}
        {detail.triggerJobs.length ? <DetailSection title="Downstream pipelines" icon={<GitPullRequest size={16} />}><div className="trigger-list">{detail.triggerJobs.map((job) => <div className="trigger-item" key={job.id}><span><strong>{job.name}</strong><small>{job.stage} · {job.ref || "—"}</small></span><StatusBadge status={job.status} />{job.downstreamPipeline?.webUrl ? <a className="icon-link" href={job.downstreamPipeline.webUrl} target="_blank" rel="noreferrer" title="Open downstream pipeline"><ExternalLink size={15} /></a> : null}</div>)}</div></DetailSection> : null}
        {detail.warnings.map((warning) => <Alert key={warning} tone="warning"><AlertTriangle size={16} /><span>{warning}</span></Alert>)}
      </div> : null}
    </aside>
  </div>;
}

function DetailSection({ title, icon, children, tone }: { title: string; icon: React.ReactNode; children: React.ReactNode; tone?: "danger" }) {
  return <section className={cn("detail-section", tone === "danger" && "detail-section-danger")}><h3>{icon}{title}</h3>{children}</section>;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-field"><span>{label}</span><strong>{value}</strong></div>;
}

function FailureItem({ job }: { job: PipelineJobDetail }) {
  return <div className="failure-item"><div className="failure-heading"><div><strong>{job.name}</strong><span>{job.stage} stage · attempt {job.attempt}{job.retryCount ? ` of ${job.retryCount + 1}` : ""}</span></div><StatusBadge status={job.status} /></div><p>{explainFailureReason(job.failure_reason)}</p><div className="failure-meta"><span>{job.failure_reason || "reason unavailable"}</span><span>{job.runner?.description || "Runner unavailable"}</span><span>{formatDuration(job.duration)}</span>{job.web_url ? <a className="text-link" href={job.web_url} target="_blank" rel="noreferrer">Open job <ExternalLink size={13} /></a> : null}</div></div>;
}

function JobDetailRow({ job }: { job: PipelineJobDetail }) {
  return <div className="job-detail-row"><span className="job-status-dot" data-status={job.status} /><div className="job-detail-copy"><strong>{job.name}{job.isRetry ? <Badge tone="warning">retry {job.attempt}</Badge> : null}{job.allow_failure ? <Badge tone="warning">allowed</Badge> : null}</strong><span>{job.stage} · {job.runner?.description || "Unassigned"}</span></div><span>{formatDuration(job.duration)}</span>{job.artifactCount ? <Badge tone="info"><FileArchive size={12} />{job.artifactCount} · {formatBytes(job.artifactBytes)}</Badge> : null}<StatusBadge status={job.status} />{job.web_url ? <a className="icon-link" href={job.web_url} target="_blank" rel="noreferrer" title="Open job" onClick={(event) => event.stopPropagation()}><ExternalLink size={15} /></a> : null}</div>;
}

function GitLabMark() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 21.4 3.3-10.1h-6.6L12 21.4Z" /><path fill="currentColor" d="m12 21.4-3.3-10.1H2.9a1.4 1.4 0 0 0-1.3 1.9l3.8 5.6a1.4 1.4 0 0 0 .8.6L12 21.4Z" opacity=".8" /><path fill="currentColor" d="m12 21.4 3.3-10.1h5.8a1.4 1.4 0 0 1 1.3 1.9l-3.8 5.6a1.4 1.4 0 0 1-.8.6L12 21.4Z" opacity=".65" /></svg>; }
