import type { ApiPagination } from "./api-pagination";

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

export type PipelineAggregateStats = {
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  runningPipelines: number;
  canceledPipelines: number;
  skippedPipelines: number;
  successRate: number;
  complete: boolean;
  scope: "project" | "instance" | "authenticated-user" | "recent-project-page";
  statusCounts?: Record<string, number>;
  trend?: PipelineTrendPoint[];
};

export type PipelineTrendPoint = {
  bucket: string;
  total: number;
  successful: number;
  failed: number;
};

export type RunnerAggregateStats = {
  totalRunners: number;
  onlineRunners: number;
  offlineRunners: number;
  pausedRunners: number;
  complete: boolean;
  scope: "project" | "instance";
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
  pipelineStats?: PipelineAggregateStats;
  runnerStats?: RunnerAggregateStats;
  jobs: JobSummary[];
  runners: RunnerSummary[];
  runnerSource: "inventory" | "unavailable";
  metrics: DashboardMetrics;
  warnings: string[];
};

export type DashboardSnapshot = DashboardData & {
  groups: GroupSummary[];
  pagination: {
    groups: ApiPagination;
    projects: ApiPagination;
    pipelines: ApiPagination;
    runners: ApiPagination;
  };
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
