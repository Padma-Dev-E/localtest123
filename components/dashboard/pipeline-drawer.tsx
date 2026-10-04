import { AlertTriangle, Clock3, ExternalLink, FileArchive, GitBranch, GitPullRequest, RefreshCw, ShieldAlert, TestTube2, Workflow, X, XCircle } from "lucide-react";

import { explainFailureReason } from "@/lib/dashboard";
import type { PipelineDetail, PipelineJobDetail, PipelineStats, PipelineSummary } from "@/lib/dashboard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, formatBytes, formatDate, formatDuration } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export function PipelineDrawer({ pipeline, detail, loading, error, onClose }: { pipeline: PipelineSummary; detail: PipelineDetail | null; loading: boolean; error: string | null; onClose: () => void }) {
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
        <DetailSection title="Run context" icon={<GitBranch size={16} />}><div className="detail-grid"><DetailField label="Created" value={formatDate(displayPipeline.createdAt)} /><DetailField label="Started" value={formatDate(displayPipeline.startedAt)} /><DetailField label="Finished" value={formatDate(displayPipeline.finishedAt)} /><DetailField label="Triggered by" value={displayPipeline.user?.name || displayPipeline.user?.username || "Unknown"} /><DetailField label={displayPipeline.tag ? "Tag" : "Branch"} value={displayPipeline.ref} /><DetailField label="Commit" value={displayPipeline.sha ? displayPipeline.sha.slice(0, 12) : "Unknown"} /></div>{displayPipeline.yamlErrors ? <div className="yaml-error"><strong>Configuration error</strong><span>{displayPipeline.yamlErrors}</span></div> : null}</DetailSection>
        {failedJobs.length ? <DetailSection title="Failure analysis" icon={<ShieldAlert size={16} />} tone="danger"><div className="failure-list">{failedJobs.map((job) => <FailureItem job={job} key={job.id} />)}</div><p className="safe-note">Job traces are kept in GitLab and are not proxied through this public dashboard. Use the job links above to inspect logs with your GitLab permissions.</p></DetailSection> : null}
        <DetailSection title="Job execution" icon={<Workflow size={16} />}><div className="job-detail-list">{detail.jobs.map((job) => <JobDetailRow job={job} key={job.id} />)}</div></DetailSection>
        {testTotal ? <DetailSection title="Test report" icon={<TestTube2 size={16} />}><div className="test-summary"><span><strong>{testTotal}</strong> total</span><span className="test-success"><strong>{testTotals?.success ?? testSummary?.success ?? 0}</strong> passed</span><span className="test-failure"><strong>{testFailed}</strong> failed</span><span><strong>{testTotals?.skipped ?? testSummary?.skipped ?? 0}</strong> skipped</span><span><strong>{formatDuration(testTotals?.time ?? testSummary?.total_time)}</strong> runtime</span></div></DetailSection> : null}
        {detail.triggerJobs.length ? <DetailSection title="Downstream pipelines" icon={<GitPullRequest size={16} />}><div className="trigger-list">{detail.triggerJobs.map((job) => <div className="trigger-item" key={job.id}><span><strong>{job.name}</strong><small>{job.stage} · {job.ref || "—"}</small></span><StatusBadge status={job.status} />{job.downstreamPipeline?.webUrl ? <a className="icon-link" href={job.downstreamPipeline.webUrl} target="_blank" rel="noreferrer" title="Open downstream pipeline"><ExternalLink size={15} /></a> : null}</div>)}</div></DetailSection> : null}
        {detail.warnings.map((warning) => <Alert key={warning} tone="warning"><AlertTriangle size={16} /><span>{warning}</span></Alert>)}
      </div> : null}
    </aside>
  </div>;
}

function DetailStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Clock3 }) {
  return <div className="detail-stat"><Icon size={15} aria-hidden="true" /><span><small>{label}</small><strong>{value}</strong></span></div>;
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
