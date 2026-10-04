import { GitLabApiError, gitlabFetch, gitlabFetchAll, projectPath } from "./gitlab";

export type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  visibility: string;
  default_branch: string | null;
  last_activity_at: string | null;
  open_issues_count: number;
};

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

export type GitLabJob = {
  id: number;
  name: string;
  stage: string;
  status: string;
  duration?: number | null;
  queued_duration?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  failure_reason?: string | null;
  allow_failure?: boolean;
  retried?: boolean | null;
  artifacts_file?: { filename?: string | null; size?: number | null } | null;
  artifacts?: Array<{ file_type?: string; size?: number | null; filename?: string; file_format?: string | null }>;
  tag_list?: string[];
  coverage?: number | null;
  web_url?: string;
  runner?: { id?: number; description?: string; status?: string; online?: boolean; paused?: boolean; version?: string; runner_type?: string } | null;
};

type GitLabRunner = {
  id: number;
  description?: string | null;
  status?: string;
  online?: boolean;
  paused?: boolean;
  tag_list?: string[];
  version?: string | null;
  contacted_at?: string | null;
  runner_type?: string;
};

export type PipelineSummary = {
  id: number;
  projectId: number;
  projectName: string;
  status: string;
  ref: string;
  iid?: number;
  sha?: string;
  beforeSha?: string;
  tag?: boolean;
  source?: string;
  yamlErrors?: string | null;
  coverage?: number | null;
  committedAt?: string | null;
  archived?: boolean;
  name?: string | null;
  user?: { id?: number; username?: string; name?: string; webUrl?: string } | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  duration: number | null;
  queuedDuration: number | null;
  webUrl: string;
};

export type JobSummary = GitLabJob & { projectId: number; projectName: string };
export type RunnerSummary = GitLabRunner & {
  observedJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDurationSeconds: number;
};
export type ProjectSummary = GitLabProject & { latestPipeline?: PipelineSummary };
export type MetricBreakdown = { name: string; count: number };

export type DashboardMetrics = {
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  runningPipelines: number;
  successRate: number;
  averageDurationSeconds: number;
  visibleRunners: number;
  failureReasons: MetricBreakdown[];
  failedStages: MetricBreakdown[];
};

export type DashboardData = {
  generatedAt: string;
  windowHours: number;
  projects: ProjectSummary[];
  pipelines: PipelineSummary[];
  jobs: JobSummary[];
  runners: RunnerSummary[];
  runnerSource: "inventory" | "job_observed" | "unavailable";
  metrics: DashboardMetrics;
  warnings: string[];
};

export function safeStatus(status: string | undefined): string {
  return status?.trim().toLowerCase() || "unknown";
}

export function calculateDurationSeconds(pipeline: Pick<PipelineSummary, "duration" | "createdAt" | "updatedAt">): number {
  if (typeof pipeline.duration === "number" && Number.isFinite(pipeline.duration)) return Math.max(0, pipeline.duration);
  const created = Date.parse(pipeline.createdAt);
  const updated = Date.parse(pipeline.updatedAt);
  return Number.isFinite(created) && Number.isFinite(updated) ? Math.max(0, Math.round((updated - created) / 1000)) : 0;
}

function countBy(items: string[]): MetricBreakdown[] {
  const counts = new Map<string, number>();
  for (const item of items.filter(Boolean)) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function buildPipelineMetrics(pipelines: PipelineSummary[], jobs: JobSummary[] = []): DashboardMetrics {
  const successful = pipelines.filter((pipeline) => safeStatus(pipeline.status) === "success").length;
  const failed = pipelines.filter((pipeline) => safeStatus(pipeline.status) === "failed").length;
  const completed = pipelines.filter((pipeline) => ["success", "failed", "canceled", "skipped"].includes(safeStatus(pipeline.status))).length;
  const totalDuration = pipelines.reduce((sum, pipeline) => sum + calculateDurationSeconds(pipeline), 0);
  const failedJobs = jobs.filter((job) => safeStatus(job.status) === "failed");

  return {
    totalPipelines: pipelines.length,
    successfulPipelines: successful,
    failedPipelines: failed,
    runningPipelines: pipelines.filter((pipeline) => ["running", "pending", "created", "waiting_for_resource"].includes(safeStatus(pipeline.status))).length,
    successRate: completed ? Math.round((successful / completed) * 100) : 0,
    averageDurationSeconds: pipelines.length ? Math.round(totalDuration / pipelines.length) : 0,
    visibleRunners: 0,
    failureReasons: countBy(failedJobs.map((job) => job.failure_reason || "unknown")),
    failedStages: countBy(failedJobs.map((job) => job.stage)),
  };
}

export function deriveObservedRunners(jobs: Array<Pick<JobSummary, "status" | "duration" | "runner">>): RunnerSummary[] {
  const observed = new Map<number, RunnerSummary & { totalDurationSeconds: number }>();
  for (const job of jobs) {
    const runner = job.runner;
    if (!runner?.id) continue;
    const current = observed.get(runner.id) || {
      id: runner.id, description: runner.description || null, status: runner.status, online: runner.online, paused: runner.paused,
      tag_list: [], version: runner.version || null, contacted_at: null, runner_type: runner.runner_type,
      observedJobs: 0, successfulJobs: 0, failedJobs: 0, averageDurationSeconds: 0, totalDurationSeconds: 0,
    };
    current.description ||= runner.description || null;
    current.version ||= runner.version || null;
    current.online ??= runner.online;
    current.paused ??= runner.paused;
    current.runner_type ||= runner.runner_type;
    current.observedJobs += 1;
    if (safeStatus(job.status) === "success") current.successfulJobs += 1;
    if (safeStatus(job.status) === "failed") current.failedJobs += 1;
    if (typeof job.duration === "number" && Number.isFinite(job.duration)) current.totalDurationSeconds += Math.max(0, job.duration);
    observed.set(runner.id, current);
  }
  return [...observed.values()].map(({ totalDurationSeconds, ...runner }) => ({ ...runner, averageDurationSeconds: runner.observedJobs ? Math.round(totalDurationSeconds / runner.observedJobs) : 0 })).sort((a, b) => b.observedJobs - a.observedJobs || a.id - b.id);
}

export function mergeWarnings(warnings: string[]): string[] {
  return [...new Set(warnings.map((warning) => warning.trim()).filter(Boolean))];
}

function formatPipeline(project: GitLabProject, pipeline: GitLabPipeline): PipelineSummary {
  return {
    id: pipeline.id, projectId: project.id, projectName: project.path_with_namespace, status: safeStatus(pipeline.status), ref: pipeline.ref,
    iid: pipeline.iid, sha: pipeline.sha, beforeSha: pipeline.before_sha, tag: pipeline.tag, source: pipeline.source,
    yamlErrors: pipeline.yaml_errors ?? null, coverage: pipeline.coverage ?? null, committedAt: pipeline.committed_at ?? null,
    archived: pipeline.archived, name: pipeline.name ?? null, user: pipeline.user ? { ...pipeline.user, webUrl: pipeline.user.web_url } : null,
    createdAt: pipeline.created_at, updatedAt: pipeline.updated_at, startedAt: pipeline.started_at ?? null, finishedAt: pipeline.finished_at ?? null,
    duration: pipeline.duration ?? null, queuedDuration: pipeline.queued_duration ?? null, webUrl: pipeline.web_url || `${project.web_url}/-/pipelines/${pipeline.id}`,
  };
}

async function collectProject(project: GitLabProject, cutoff: string) {
  const warnings: string[] = [];
  const [pipelineResult, jobResult] = await Promise.allSettled([
    gitlabFetchAll<GitLabPipeline>(`${projectPath(project.id, "/pipelines")}?updated_after=${encodeURIComponent(cutoff)}&order_by=updated_at&sort=desc`),
    gitlabFetchAll<GitLabJob>(`${projectPath(project.id, "/jobs")}?created_after=${encodeURIComponent(cutoff)}&include_retried=true&order_by=created_at&sort=desc`),
  ]);
  const cutoffTime = Date.parse(cutoff);
  const isRecent = (value: string | undefined) => {
    const timestamp = Date.parse(value || "");
    return !Number.isFinite(timestamp) || timestamp >= cutoffTime;
  };
  const pipelines = pipelineResult.status === "fulfilled"
    ? pipelineResult.value.map((pipeline) => formatPipeline(project, pipeline)).filter((pipeline) => isRecent(pipeline.updatedAt))
    : [];
  const jobs = jobResult.status === "fulfilled"
    ? jobResult.value.filter((job) => isRecent(job.created_at)).map((job) => ({ ...job, projectId: project.id, projectName: project.path_with_namespace }))
    : [];
  if (pipelineResult.status === "rejected") warnings.push(`Pipeline data unavailable for ${project.path_with_namespace}`);
  if (jobResult.status === "rejected") warnings.push(`Job data unavailable for ${project.path_with_namespace}`);
  return { pipelines, jobs, warnings };
}

export async function getDashboardData(options: { projectId?: number }): Promise<DashboardData> {
  const windowHours = 24;
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const warnings: string[] = [];
  let projects: GitLabProject[];

  try {
    projects = await gitlabFetchAll<GitLabProject>("/projects?order_by=last_activity_at&sort=desc");
  } catch (error) {
    const message = error instanceof GitLabApiError && error.status === 503 ? "Dashboard is not configured with a GitLab read-only token" : "GitLab projects could not be loaded";
    return { generatedAt: new Date().toISOString(), windowHours, projects: [], pipelines: [], jobs: [], runners: [], runnerSource: "unavailable", metrics: buildPipelineMetrics([]), warnings: [message] };
  }

  if (options.projectId) projects = projects.filter((project) => project.id === options.projectId);
  const projectResults = await Promise.all(projects.map((project) => collectProject(project, cutoff)));
  const pipelines = projectResults.flatMap((result) => result.pipelines).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const jobs = projectResults.flatMap((result) => result.jobs).sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""));
  warnings.push(...projectResults.flatMap((result) => result.warnings));

  const latestByProject = new Map<number, PipelineSummary>();
  for (const pipeline of pipelines) if (!latestByProject.has(pipeline.projectId)) latestByProject.set(pipeline.projectId, pipeline);
  const projectSummaries = projects.map((project) => ({ ...project, latestPipeline: latestByProject.get(project.id) }));

  let runners: RunnerSummary[] = [];
  let runnerSource: DashboardData["runnerSource"] = "unavailable";
  try {
    runners = (await gitlabFetchAll<GitLabRunner>("/runners/all")).map((runner) => ({ ...runner, observedJobs: 0, successfulJobs: 0, failedJobs: 0, averageDurationSeconds: 0 }));
    runnerSource = "inventory";
  } catch (error) {
    const observed = deriveObservedRunners(jobs);
    if (observed.length) {
      runners = observed;
      runnerSource = "job_observed";
      warnings.push(`Full runner inventory is unavailable; showing ${observed.length} runner(s) observed through readable jobs`);
    } else {
      warnings.push(error instanceof GitLabApiError && error.status === 403 ? "Full runner inventory is unavailable to this GitLab token" : "Runner inventory could not be loaded");
    }
  }

  const metrics = buildPipelineMetrics(pipelines, jobs);
  metrics.visibleRunners = runners.filter((runner) => runner.online && !runner.paused || runnerSource === "job_observed" && runner.status === "online").length;
  return { generatedAt: new Date().toISOString(), windowHours, projects: projectSummaries, pipelines, jobs, runners, runnerSource, metrics, warnings: mergeWarnings(warnings) };
}
