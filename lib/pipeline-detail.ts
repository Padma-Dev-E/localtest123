import { gitlabFetch, gitlabFetchAll, projectPath } from "./gitlab";
import type { GitLabJob, GitLabProject, JobSummary, PipelineSummary } from "./dashboard";
import { safeStatus } from "./dashboard";

type GitLabPipeline = {
  id: number;
  project_id: number;
  iid?: number;
  status: string;
  ref: string;
  sha?: string;
  before_sha?: string;
  tag?: boolean;
  source?: string;
  created_at: string;
  updated_at: string;
  committed_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  queued_duration?: number | null;
  yaml_errors?: string | null;
  coverage?: number | null;
  archived?: boolean;
  name?: string | null;
  user?: { id?: number; username?: string; name?: string; web_url?: string } | null;
  web_url?: string;
};

type GitLabTriggerJob = {
  id: number;
  name: string;
  stage: string;
  status: string;
  ref?: string;
  web_url?: string;
  downstream_pipeline?: { id?: number; iid?: number; ref?: string; status?: string; web_url?: string } | null;
};

type GitLabTestReportTotals = { time?: number; count?: number; success?: number; failed?: number; skipped?: number; error?: number; suite_error?: string | null };
type GitLabTestReportSummary = { total?: GitLabTestReportTotals | number; total_time?: number; total_count?: number; success?: number; failed?: number; skipped?: number; error?: number; test_cases?: number; test_suites?: Array<Record<string, unknown>> };

export type PipelineJobDetail = JobSummary & { attempt: number; retryCount: number; isRetry: boolean; artifactCount: number; artifactBytes: number };
export type TriggerJobSummary = { id: number; name: string; stage: string; status: string; ref?: string; webUrl?: string; downstreamPipeline?: { id?: number; iid?: number; ref?: string; status?: string; webUrl?: string } | null };
export type PipelineStats = { totalJobs: number; failedJobs: number; successfulJobs: number; skippedJobs: number; canceledJobs: number; activeJobs: number; retries: number; artifactCount: number; artifactBytes: number; failureReasons: string[]; failedStages: string[] };
export type PipelineDetail = { pipeline: PipelineSummary; jobs: PipelineJobDetail[]; triggerJobs: TriggerJobSummary[]; testReportSummary: GitLabTestReportSummary | null; stats: PipelineStats; warnings: string[] };

type PipelineJobInput = GitLabJob & { projectId?: number; projectName?: string };

function artifactSize(job: GitLabJob) {
  const artifacts = job.artifacts || [];
  const traceArtifact = job.artifacts_file && !artifacts.some((artifact) => artifact.file_type === "trace");
  return {
    count: artifacts.length + (traceArtifact ? 1 : 0),
    bytes: artifacts.reduce((sum, artifact) => sum + (typeof artifact.size === "number" ? Math.max(0, artifact.size) : 0), 0) + (traceArtifact && typeof job.artifacts_file?.size === "number" ? Math.max(0, job.artifacts_file.size) : 0),
  };
}

export function summarizeJobAttempts(jobs: PipelineJobInput[]): PipelineJobDetail[] {
  const ordered = [...jobs].sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || "") || a.id - b.id);
  const groups = new Map<string, PipelineJobInput[]>();
  for (const job of ordered) {
    const key = `${job.stage}\u0000${job.name}`;
    groups.set(key, [...(groups.get(key) || []), job]);
  }
  return ordered.map((job) => {
    const group = groups.get(`${job.stage}\u0000${job.name}`) || [job];
    const attempt = group.findIndex((candidate) => candidate.id === job.id) + 1;
    const artifact = artifactSize(job);
    return { ...job, projectId: job.projectId ?? 0, projectName: job.projectName ?? "", attempt, retryCount: group.length - 1, isRetry: attempt > 1, artifactCount: artifact.count, artifactBytes: artifact.bytes };
  });
}

export function summarizePipelineStats(jobs: PipelineJobDetail[]): PipelineStats {
  const count = (status: string) => jobs.filter((job) => safeStatus(job.status) === status).length;
  return {
    totalJobs: jobs.length, failedJobs: count("failed"), successfulJobs: count("success"), skippedJobs: count("skipped"), canceledJobs: count("canceled"),
    activeJobs: jobs.filter((job) => ["created", "pending", "running", "waiting_for_resource", "preparing"].includes(safeStatus(job.status))).length,
    retries: jobs.reduce((sum, job) => sum + (job.attempt === 1 ? job.retryCount : 0), 0), artifactCount: jobs.reduce((sum, job) => sum + job.artifactCount, 0), artifactBytes: jobs.reduce((sum, job) => sum + job.artifactBytes, 0),
    failureReasons: [...new Set(jobs.filter((job) => safeStatus(job.status) === "failed" && job.failure_reason).map((job) => job.failure_reason as string))],
    failedStages: [...new Set(jobs.filter((job) => safeStatus(job.status) === "failed").map((job) => job.stage).filter(Boolean))],
  };
}

export function explainFailureReason(reason: string | null | undefined): string {
  const explanations: Record<string, string> = {
    script_failure: "The job script returned a non-zero exit code.",
    runner_system_failure: "The runner failed while preparing or executing the job.",
    job_execution_timeout: "The job exceeded its configured execution timeout.",
    api_failure: "The runner could not communicate with the GitLab API.",
    runner_configuration_error: "The runner or container configuration prevented execution.",
    runner_external_dependency_failure: "An external dependency, such as a container registry, was unreachable.",
    stuck_or_timeout_failure: "The job could not be scheduled or timed out while waiting.",
    data_integrity_failure: "GitLab detected a data integrity problem while processing the job.",
  };
  if (!reason) return "GitLab did not provide a failure reason.";
  return explanations[reason] || `GitLab reported failure reason: ${reason.replaceAll("_", " ")}.`;
}

function formatPipeline(project: GitLabProject, pipeline: GitLabPipeline): PipelineSummary {
  return {
    id: pipeline.id, projectId: project.id, projectName: project.path_with_namespace, status: safeStatus(pipeline.status), ref: pipeline.ref,
    iid: pipeline.iid, sha: pipeline.sha, beforeSha: pipeline.before_sha, tag: pipeline.tag, source: pipeline.source, yamlErrors: pipeline.yaml_errors ?? null,
    coverage: pipeline.coverage ?? null, committedAt: pipeline.committed_at ?? null, archived: pipeline.archived, name: pipeline.name ?? null,
    user: pipeline.user ? { ...pipeline.user, webUrl: pipeline.user.web_url } : null, createdAt: pipeline.created_at, updatedAt: pipeline.updated_at,
    startedAt: pipeline.started_at ?? null, finishedAt: pipeline.finished_at ?? null, duration: pipeline.duration ?? null, queuedDuration: pipeline.queued_duration ?? null,
    webUrl: pipeline.web_url || `${project.web_url}/-/pipelines/${pipeline.id}`,
  };
}

function formatTriggerJob(job: GitLabTriggerJob): TriggerJobSummary {
  return { id: job.id, name: job.name, stage: job.stage, status: safeStatus(job.status), ref: job.ref, webUrl: job.web_url, downstreamPipeline: job.downstream_pipeline ? { id: job.downstream_pipeline.id, iid: job.downstream_pipeline.iid, ref: job.downstream_pipeline.ref, status: job.downstream_pipeline.status ? safeStatus(job.downstream_pipeline.status) : undefined, webUrl: job.downstream_pipeline.web_url } : null };
}

export async function getPipelineDetails(projectId: number, pipelineId: number): Promise<PipelineDetail> {
  const project = await gitlabFetch<GitLabProject>(`/projects/${encodeURIComponent(String(projectId))}`);
  const pipeline = await gitlabFetch<GitLabPipeline>(projectPath(projectId, `/pipelines/${pipelineId}`));
  const [jobsResult, triggerResult, testSummaryResult] = await Promise.allSettled([
    gitlabFetchAll<GitLabJob>(`${projectPath(projectId, `/pipelines/${pipelineId}/jobs`)}?include_retried=true`),
    gitlabFetchAll<GitLabTriggerJob>(projectPath(projectId, `/pipelines/${pipelineId}/trigger_jobs`)),
    gitlabFetch<GitLabTestReportSummary>(projectPath(projectId, `/pipelines/${pipelineId}/test_report_summary`)),
  ]);
  const warnings: string[] = [];
  if (jobsResult.status === "rejected") warnings.push("Job diagnostics are unavailable for this pipeline");
  if (triggerResult.status === "rejected") warnings.push("Downstream trigger jobs are unavailable for this pipeline");
  if (testSummaryResult.status === "rejected") warnings.push("Test report data is unavailable for this pipeline");
  const jobs = summarizeJobAttempts((jobsResult.status === "fulfilled" ? jobsResult.value : []).map((job) => ({ ...job, projectId, projectName: project.path_with_namespace })));
  return { pipeline: formatPipeline(project, pipeline), jobs, triggerJobs: triggerResult.status === "fulfilled" ? triggerResult.value.map(formatTriggerJob) : [], testReportSummary: testSummaryResult.status === "fulfilled" ? testSummaryResult.value : null, stats: summarizePipelineStats(jobs), warnings: [...new Set(warnings)] };
}
