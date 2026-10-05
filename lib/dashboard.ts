import { GitLabApiError, gitlabFetchAll, gitlabFetchPage, projectPath } from "./gitlab";

export type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  visibility: string;
  default_branch: string | null;
  last_activity_at: string | null;
  open_issues_count?: number;
  namespace?: GitLabNamespace;
};

export type GitLabNamespace = {
  id: number;
  name: string;
  path: string;
  kind: "user" | "group" | string;
  full_path: string;
  parent_id?: number | null;
  web_url?: string | null;
};

export type GroupSummary = {
  id: number;
  name: string;
  path: string;
  full_path: string;
  full_name?: string;
  parent_id?: number | null;
  description?: string | null;
  visibility?: string;
  web_url?: string | null;
  avatar_url?: string | null;
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

export type GitLabRunner = {
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
export type RunnerSummary = GitLabRunner;
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
  projectCount: number;
  runnerCount: number;
  projects: ProjectSummary[];
  pipelines: PipelineSummary[];
  jobs: JobSummary[];
  runners: RunnerSummary[];
  runnerSource: "inventory" | "unavailable";
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
  let rawPipelines: GitLabPipeline[] = [];
  try {
    rawPipelines = await gitlabFetchAll<GitLabPipeline>(`${projectPath(project.id, "/pipelines")}?updated_after=${encodeURIComponent(cutoff)}&order_by=updated_at&sort=desc`);
  } catch {
    warnings.push(`Pipeline data unavailable for ${project.path_with_namespace}`);
  }
  const cutoffTime = Date.parse(cutoff);
  const isRecent = (value: string | undefined) => {
    const timestamp = Date.parse(value || "");
    return !Number.isFinite(timestamp) || timestamp >= cutoffTime;
  };
  const pipelines = rawPipelines.map((pipeline) => formatPipeline(project, pipeline)).filter((pipeline) => isRecent(pipeline.updatedAt));
  return { pipelines, warnings };
}

async function mapConcurrent<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 6): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function getDashboardData(options: { projectId?: number }): Promise<DashboardData> {
  const windowHours = 24;
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const warnings: string[] = [];
  let projects: GitLabProject[];
  let projectCount = 0;

  try {
    const projectPage = await gitlabFetchPage<GitLabProject[]>("/projects?simple=true&order_by=last_activity_at&sort=desc&per_page=100&page=1");
    projects = projectPage.data;
    projectCount = Number(projectPage.headers.get("x-total")) || projects.length;
  } catch (error) {
    const message = error instanceof GitLabApiError && error.status === 503 ? "Dashboard is not configured with a GitLab read-only token" : "GitLab projects could not be loaded";
    return { generatedAt: new Date().toISOString(), windowHours, projectCount: 0, runnerCount: 0, projects: [], pipelines: [], jobs: [], runners: [], runnerSource: "unavailable", metrics: buildPipelineMetrics([]), warnings: [message] };
  }

  let pipelineProjects = projects;
  if (!options.projectId) {
    try {
      const recentPage = await gitlabFetchPage<GitLabProject[]>(`/projects?simple=true&last_activity_after=${encodeURIComponent(cutoff)}&order_by=last_activity_at&sort=desc&per_page=100&page=1`);
      pipelineProjects = recentPage.data;
    } catch {
      warnings.push("Recently active projects could not be identified; pipeline counts may be incomplete");
      pipelineProjects = [];
    }
  } else {
    pipelineProjects = projects.filter((project) => project.id === options.projectId);
  }

  const projectResults = await mapConcurrent(pipelineProjects, (project) => collectProject(project, cutoff));
  const pipelines = projectResults.flatMap((result) => result.pipelines).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  warnings.push(...projectResults.flatMap((result) => result.warnings));

  const latestByProject = new Map<number, PipelineSummary>();
  for (const pipeline of pipelines) if (!latestByProject.has(pipeline.projectId)) latestByProject.set(pipeline.projectId, pipeline);
  const projectSummaries = projects.map((project) => ({ ...project, latestPipeline: latestByProject.get(project.id) }));

  let runners: RunnerSummary[] = [];
  let runnerSource: DashboardData["runnerSource"] = "unavailable";
  let runnerCount = 0;
  try {
    const runnerPage = await gitlabFetchPage<GitLabRunner[]>("/runners/all?per_page=100&page=1");
    runners = runnerPage.data;
    runnerCount = Number(runnerPage.headers.get("x-total")) || runners.length;
    runnerSource = "inventory";
  } catch (error) {
    warnings.push(error instanceof GitLabApiError && error.status === 403 ? "Full runner inventory is unavailable to this GitLab token" : "Runner inventory could not be loaded");
  }

  const metrics = buildPipelineMetrics(pipelines);
  metrics.visibleRunners = runners.filter((runner) => runner.online && !runner.paused).length;
  return { generatedAt: new Date().toISOString(), windowHours, projectCount, runnerCount, projects: projectSummaries, pipelines, jobs: [], runners, runnerSource, metrics, warnings: mergeWarnings(warnings) };
}
