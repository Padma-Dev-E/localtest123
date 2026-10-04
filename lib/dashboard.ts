import { GitLabApiError, gitlabFetch, projectPath } from "./gitlab";

export type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  visibility: string;
  default_branch: string | null;
  last_activity_at: string | null;
  open_issues_count: number;
  namespace?: { full_path?: string };
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

type GitLabJob = {
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
  source?: string;
  coverage?: number | null;
  runner_manager?: { id?: number; system_id?: string; version?: string; platform?: string; architecture?: string } | null;
  commit?: { id?: string; short_id?: string; title?: string; author_name?: string; committed_date?: string } | null;
  pipeline?: { id?: number; iid?: number; ref?: string; status?: string; web_url?: string } | null;
  web_url?: string;
  runner?: { id?: number; description?: string; status?: string; online?: boolean; paused?: boolean; version?: string; runner_type?: string } | null;
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

type GitLabTestReportTotals = {
  time?: number;
  count?: number;
  success?: number;
  failed?: number;
  skipped?: number;
  error?: number;
  suite_error?: string | null;
};

type GitLabTestReportSummary = {
  total?: GitLabTestReportTotals | number;
  total_time?: number;
  total_count?: number;
  success?: number;
  failed?: number;
  skipped?: number;
  error?: number;
  test_cases?: number;
  test_suites?: Array<Record<string, unknown>>;
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

type GitLabEnvironment = {
  id: number;
  name: string;
  slug: string;
  state: string;
  external_url?: string | null;
  updated_at?: string | null;
  web_url?: string;
};

type GitLabDeployment = {
  id: number;
  status: string;
  environment: { name: string; slug: string };
  deployable?: { name?: string; ref?: string; web_url?: string } | null;
  created_at: string;
  finished_at?: string | null;
  updated_at?: string;
  web_url?: string;
};

type GitLabMergeRequest = {
  id: number;
  iid: number;
  title: string;
  state: string;
  author?: { name?: string; username?: string };
  updated_at: string;
  web_url: string;
};

type GitLabIssue = {
  id: number;
  iid: number;
  title: string;
  state: string;
  author?: { name?: string; username?: string };
  updated_at: string;
  web_url: string;
};

type GitLabCommit = {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  committed_date: string;
  web_url: string;
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
export type PipelineJobDetail = JobSummary & {
  attempt: number;
  retryCount: number;
  isRetry: boolean;
  artifactCount: number;
  artifactBytes: number;
};
export type TriggerJobSummary = {
  id: number;
  name: string;
  stage: string;
  status: string;
  ref?: string;
  webUrl?: string;
  downstreamPipeline?: { id?: number; iid?: number; ref?: string; status?: string; webUrl?: string } | null;
};
export type PipelineStats = {
  totalJobs: number;
  failedJobs: number;
  successfulJobs: number;
  skippedJobs: number;
  canceledJobs: number;
  activeJobs: number;
  retries: number;
  artifactCount: number;
  artifactBytes: number;
  failureReasons: string[];
  failedStages: string[];
};
export type PipelineDetail = {
  pipeline: PipelineSummary;
  jobs: PipelineJobDetail[];
  triggerJobs: TriggerJobSummary[];
  testReportSummary: GitLabTestReportSummary | null;
  stats: PipelineStats;
  warnings: string[];
};
export type RunnerSummary = GitLabRunner & {
  observedJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDurationSeconds: number;
};
export type ProjectSummary = GitLabProject & { latestPipeline?: PipelineSummary };
export type ActivityItem = {
  kind: "merge_request" | "issue" | "commit";
  projectName: string;
  title: string;
  actor: string;
  updatedAt: string;
  webUrl: string;
};

export type DashboardMetrics = {
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  successRate: number;
  averageDurationSeconds: number;
  activeEnvironments: number;
  visibleRunners: number;
};

export type DashboardData = {
  generatedAt: string;
  windowDays: number;
  projects: ProjectSummary[];
  pipelines: PipelineSummary[];
  jobs: JobSummary[];
  runners: RunnerSummary[];
  runnerSource: "inventory" | "job_observed" | "unavailable";
  environments: Array<GitLabEnvironment & { projectId: number; projectName: string }>;
  deployments: Array<GitLabDeployment & { projectId: number; projectName: string }>;
  activity: ActivityItem[];
  metrics: DashboardMetrics;
  warnings: string[];
};

function safeStatus(status: string | undefined): string {
  return status?.trim().toLowerCase() || "unknown";
}

export function calculateDurationSeconds(pipeline: Pick<PipelineSummary, "duration" | "createdAt" | "updatedAt">): number {
  if (typeof pipeline.duration === "number" && Number.isFinite(pipeline.duration)) {
    return Math.max(0, pipeline.duration);
  }

  const created = Date.parse(pipeline.createdAt);
  const updated = Date.parse(pipeline.updatedAt);
  if (!Number.isFinite(created) || !Number.isFinite(updated)) {
    return 0;
  }
  return Math.max(0, Math.round((updated - created) / 1000));
}

export function buildPipelineMetrics(pipelines: PipelineSummary[]): DashboardMetrics {
  const successful = pipelines.filter((pipeline) => safeStatus(pipeline.status) === "success").length;
  const failed = pipelines.filter((pipeline) => safeStatus(pipeline.status) === "failed").length;
  const completed = pipelines.filter((pipeline) => ["success", "failed", "canceled", "skipped"].includes(safeStatus(pipeline.status))).length;
  const totalDuration = pipelines.reduce((sum, pipeline) => sum + calculateDurationSeconds(pipeline), 0);

  return {
    totalPipelines: pipelines.length,
    successfulPipelines: successful,
    failedPipelines: failed,
    successRate: completed ? Math.round((successful / completed) * 100) : 0,
    averageDurationSeconds: pipelines.length ? Math.round(totalDuration / pipelines.length) : 0,
    activeEnvironments: 0,
    visibleRunners: 0,
  };
}

export function deriveObservedRunners(jobs: Array<Pick<JobSummary, "status" | "duration" | "runner">>): RunnerSummary[] {
  const observed = new Map<number, RunnerSummary & { totalDurationSeconds: number }>();

  for (const job of jobs) {
    const runner = job.runner;
    if (!runner?.id) continue;

    const current = observed.get(runner.id) || {
      id: runner.id,
      description: runner.description || null,
      status: runner.status,
      online: runner.online,
      paused: runner.paused,
      tag_list: [],
      version: runner.version || null,
      contacted_at: null,
      runner_type: runner.runner_type,
      observedJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageDurationSeconds: 0,
      totalDurationSeconds: 0,
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

  return [...observed.values()]
    .map(({ totalDurationSeconds, ...runner }) => ({
      ...runner,
      averageDurationSeconds: runner.observedJobs ? Math.round(totalDurationSeconds / runner.observedJobs) : 0,
    }))
    .sort((a, b) => b.observedJobs - a.observedJobs || a.id - b.id);
}

export function mergeWarnings(warnings: string[]): string[] {
  return [...new Set(warnings.map((warning) => warning.trim()).filter(Boolean))];
}

function jobAttemptKey(job: Pick<GitLabJob, "name" | "stage">): string {
  return `${job.stage}\u0000${job.name}`;
}

function artifactSize(job: GitLabJob): { count: number; bytes: number } {
  const artifacts = job.artifacts || [];
  const traceArtifact = job.artifacts_file && !artifacts.some((artifact) => artifact.file_type === "trace");
  return {
    count: artifacts.length + (traceArtifact ? 1 : 0),
    bytes: artifacts.reduce((sum, artifact) => sum + (typeof artifact.size === "number" && Number.isFinite(artifact.size) ? Math.max(0, artifact.size) : 0), 0) +
      (traceArtifact && typeof job.artifacts_file?.size === "number" ? Math.max(0, job.artifacts_file.size) : 0),
  };
}

type PipelineJobInput = GitLabJob & { projectId?: number; projectName?: string };

export function summarizeJobAttempts(jobs: PipelineJobInput[]): PipelineJobDetail[] {
  const ordered = [...jobs].sort((a, b) => {
    const createdDifference = Date.parse(a.created_at || "") - Date.parse(b.created_at || "");
    return Number.isFinite(createdDifference) && createdDifference !== 0 ? createdDifference : a.id - b.id;
  });
  const grouped = new Map<string, GitLabJob[]>();
  for (const job of ordered) {
    const key = jobAttemptKey(job);
    const group = grouped.get(key) || [];
    group.push(job);
    grouped.set(key, group);
  }

  return ordered.map((job) => {
    const group = grouped.get(jobAttemptKey(job)) || [job];
    const attempt = Math.max(1, group.findIndex((candidate) => candidate.id === job.id) + 1);
    const artifact = artifactSize(job);
    return {
      ...job,
      projectId: job.projectId ?? 0,
      projectName: job.projectName ?? "",
      attempt,
      retryCount: Math.max(0, group.length - 1),
      isRetry: attempt > 1,
      artifactCount: artifact.count,
      artifactBytes: artifact.bytes,
    };
  });
}

export function summarizePipelineStats(jobs: PipelineJobDetail[]): PipelineStats {
  const statusCount = (status: string) => jobs.filter((job) => safeStatus(job.status) === status).length;
  return {
    totalJobs: jobs.length,
    failedJobs: statusCount("failed"),
    successfulJobs: statusCount("success"),
    skippedJobs: statusCount("skipped"),
    canceledJobs: statusCount("canceled"),
    activeJobs: jobs.filter((job) => ["created", "pending", "running", "waiting_for_resource", "preparing"].includes(safeStatus(job.status))).length,
    retries: jobs.reduce((sum, job) => sum + (job.attempt === 1 ? job.retryCount : 0), 0),
    artifactCount: jobs.reduce((sum, job) => sum + job.artifactCount, 0),
    artifactBytes: jobs.reduce((sum, job) => sum + job.artifactBytes, 0),
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
    id: pipeline.id,
    projectId: project.id,
    projectName: project.path_with_namespace,
    status: safeStatus(pipeline.status),
    ref: pipeline.ref,
    iid: pipeline.iid,
    sha: pipeline.sha,
    beforeSha: pipeline.before_sha,
    tag: pipeline.tag,
    source: pipeline.source,
    yamlErrors: pipeline.yaml_errors ?? null,
    coverage: pipeline.coverage ?? null,
    committedAt: pipeline.committed_at ?? null,
    archived: pipeline.archived,
    name: pipeline.name ?? null,
    user: pipeline.user ? { ...pipeline.user, webUrl: pipeline.user.web_url } : null,
    createdAt: pipeline.created_at,
    updatedAt: pipeline.updated_at,
    startedAt: pipeline.started_at ?? null,
    finishedAt: pipeline.finished_at ?? null,
    duration: pipeline.duration ?? null,
    queuedDuration: pipeline.queued_duration ?? null,
    webUrl: pipeline.web_url || `${project.web_url}/-/pipelines/${pipeline.id}`,
  };
}

async function collectProjectData(projects: GitLabProject[], cutoff: number) {
  const warnings: string[] = [];
  const pipelines: PipelineSummary[] = [];
  const jobs: JobSummary[] = [];
  const runnerJobs: JobSummary[] = [];
  const environments: DashboardData["environments"] = [];
  const deployments: DashboardData["deployments"] = [];
  const activity: ActivityItem[] = [];
  const latestByProject = new Map<number, PipelineSummary>();

  await Promise.all(
    projects.map(async (project) => {
      const [pipelineResult, environmentResult, deploymentResult, mergeRequestResult, issueResult, commitResult, runnerJobResult] = await Promise.allSettled([
        gitlabFetch<GitLabPipeline[]>(`${projectPath(project.id, "/pipelines")}?per_page=20&order_by=updated_at&sort=desc`),
        gitlabFetch<GitLabEnvironment[]>(`${projectPath(project.id, "/environments")}?per_page=10`),
        gitlabFetch<GitLabDeployment[]>(`${projectPath(project.id, "/deployments")}?per_page=10&order_by=updated_at&sort=desc`),
        gitlabFetch<GitLabMergeRequest[]>(`${projectPath(project.id, "/merge_requests")}?state=opened&per_page=5&order_by=updated_at&sort=desc`),
        gitlabFetch<GitLabIssue[]>(`${projectPath(project.id, "/issues")}?state=opened&per_page=5&order_by=updated_at&sort=desc`),
        gitlabFetch<GitLabCommit[]>(`${projectPath(project.id, "/repository/commits")}?per_page=5`),
        gitlabFetch<GitLabJob[]>(`${projectPath(project.id, "/jobs")}?per_page=100&include_retried=true&order_by=created_at&sort=desc`),
      ]);

      if (runnerJobResult.status === "fulfilled") {
        runnerJobs.push(...runnerJobResult.value
          .filter((job) => !job.created_at || Date.parse(job.created_at) >= cutoff)
          .map((job) => ({ ...job, projectId: project.id, projectName: project.path_with_namespace })));
      }

      if (pipelineResult.status === "fulfilled") {
        for (const pipeline of pipelineResult.value) {
          const formatted = formatPipeline(project, pipeline);
          if (Date.parse(formatted.createdAt) >= cutoff || !Number.isFinite(Date.parse(formatted.createdAt))) {
            pipelines.push(formatted);
          }
        }
        const latest = pipelineResult.value[0];
        if (latest) {
          latestByProject.set(project.id, formatPipeline(project, latest));
          try {
            const projectJobs = await gitlabFetch<GitLabJob[]>(`${projectPath(project.id, `/pipelines/${latest.id}/jobs`)}?per_page=50&include_retried=true`);
            jobs.push(...projectJobs.map((job) => ({ ...job, projectId: project.id, projectName: project.path_with_namespace })));
          } catch {
            warnings.push(`Job details unavailable for ${project.path_with_namespace}`);
          }
        }
      } else {
        warnings.push(`Pipeline data unavailable for ${project.path_with_namespace}`);
      }

      if (environmentResult.status === "fulfilled") {
        environments.push(...environmentResult.value.map((environment) => ({ ...environment, projectId: project.id, projectName: project.path_with_namespace })));
      } else {
        warnings.push(`Environment data unavailable for ${project.path_with_namespace}`);
      }

      if (deploymentResult.status === "fulfilled") {
        deployments.push(...deploymentResult.value.map((deployment) => ({ ...deployment, projectId: project.id, projectName: project.path_with_namespace })));
      }

      if (mergeRequestResult.status === "fulfilled") {
        activity.push(...mergeRequestResult.value.map((item) => ({ kind: "merge_request" as const, projectName: project.path_with_namespace, title: item.title, actor: item.author?.name || item.author?.username || "Unknown", updatedAt: item.updated_at, webUrl: item.web_url })));
      }

      if (issueResult.status === "fulfilled") {
        activity.push(...issueResult.value.map((item) => ({ kind: "issue" as const, projectName: project.path_with_namespace, title: item.title, actor: item.author?.name || item.author?.username || "Unknown", updatedAt: item.updated_at, webUrl: item.web_url })));
      }

      if (commitResult.status === "fulfilled") {
        activity.push(...commitResult.value.map((item) => ({ kind: "commit" as const, projectName: project.path_with_namespace, title: item.title, actor: item.author_name, updatedAt: item.committed_date, webUrl: item.web_url })));
      }
    }),
  );

  return { warnings, pipelines, jobs, runnerJobs, environments, deployments, activity, latestByProject };
}

function formatTriggerJob(job: GitLabTriggerJob): TriggerJobSummary {
  return {
    id: job.id,
    name: job.name,
    stage: job.stage,
    status: safeStatus(job.status),
    ref: job.ref,
    webUrl: job.web_url,
    downstreamPipeline: job.downstream_pipeline ? {
      id: job.downstream_pipeline.id,
      iid: job.downstream_pipeline.iid,
      ref: job.downstream_pipeline.ref,
      status: job.downstream_pipeline.status ? safeStatus(job.downstream_pipeline.status) : undefined,
      webUrl: job.downstream_pipeline.web_url,
    } : null,
  };
}

export async function getPipelineDetails(projectId: number, pipelineId: number): Promise<PipelineDetail> {
  const project = await gitlabFetch<GitLabProject>(`/projects/${encodeURIComponent(String(projectId))}`);
  const pipeline = await gitlabFetch<GitLabPipeline>(projectPath(projectId, `/pipelines/${pipelineId}`));
  const warnings: string[] = [];

  const [jobsResult, triggerResult, testSummaryResult] = await Promise.allSettled([
    gitlabFetch<GitLabJob[]>(`${projectPath(projectId, `/pipelines/${pipelineId}/jobs`)}?per_page=100&include_retried=true`),
    gitlabFetch<GitLabTriggerJob[]>(`${projectPath(projectId, `/pipelines/${pipelineId}/trigger_jobs`)}?per_page=100`),
    gitlabFetch<GitLabTestReportSummary>(projectPath(projectId, `/pipelines/${pipelineId}/test_report_summary`)),
  ]);

  const rawJobs = jobsResult.status === "fulfilled" ? jobsResult.value : [];
  if (jobsResult.status === "rejected") warnings.push("Job diagnostics are unavailable for this pipeline");
  if (triggerResult.status === "rejected") warnings.push("Downstream trigger jobs are unavailable for this pipeline");
  if (testSummaryResult.status === "rejected") warnings.push("Test report data is unavailable for this pipeline");

  const jobs = summarizeJobAttempts(rawJobs.map((job) => ({ ...job, projectId, projectName: project.path_with_namespace })));
  return {
    pipeline: formatPipeline(project, pipeline),
    jobs,
    triggerJobs: triggerResult.status === "fulfilled" ? triggerResult.value.map(formatTriggerJob) : [],
    testReportSummary: testSummaryResult.status === "fulfilled" ? testSummaryResult.value : null,
    stats: summarizePipelineStats(jobs),
    warnings: mergeWarnings(warnings),
  };
}

export async function getDashboardData(options: { days: number; projectId?: number }): Promise<DashboardData> {
  const days = [7, 30, 90].includes(options.days) ? options.days : 30;
  const projectLimit = Math.min(Math.max(Number(process.env.GITLAB_PROJECT_LIMIT || 25), 1), 50);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const warnings: string[] = [];
  let projects: GitLabProject[];

  try {
    projects = await gitlabFetch<GitLabProject[]>(`/projects?membership=true&min_access_level=20&per_page=${projectLimit}&order_by=last_activity_at&sort=desc`);
  } catch (error) {
    const message = error instanceof GitLabApiError && error.status === 503 ? "Dashboard is not configured with a GitLab Reporter token" : "GitLab projects could not be loaded";
    return {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      projects: [],
      pipelines: [],
      jobs: [],
      runners: [],
      runnerSource: "unavailable",
      environments: [],
      deployments: [],
      activity: [],
      metrics: buildPipelineMetrics([]),
      warnings: [message],
    };
  }

  if (options.projectId) {
    projects = projects.filter((project) => project.id === options.projectId);
  }

  const projectData = await collectProjectData(projects, cutoff);

  let runners: RunnerSummary[] = [];
  let runnerSource: DashboardData["runnerSource"] = "unavailable";
  try {
    runners = (await gitlabFetch<GitLabRunner[]>("/runners/all?per_page=100")).map((runner) => ({
      ...runner,
      observedJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageDurationSeconds: 0,
    }));
    runnerSource = "inventory";
  } catch (error) {
    const observedRunners = deriveObservedRunners(projectData.runnerJobs);
    if (observedRunners.length) {
      runners = observedRunners;
      runnerSource = "job_observed";
      warnings.push(`Full runner inventory is unavailable to Reporter access; showing ${observedRunners.length} runner(s) observed through readable jobs`);
    } else {
      warnings.push(error instanceof GitLabApiError && error.status === 403 ? "Runner inventory is unavailable to Reporter access" : "Runner inventory could not be loaded");
    }
  }

  const metrics = buildPipelineMetrics(projectData.pipelines);
  metrics.activeEnvironments = projectData.environments.filter((environment) => environment.state === "available").length;
  metrics.visibleRunners = runners.filter((runner) => runner.online && !runner.paused || runnerSource === "job_observed" && runner.status === "online").length;

  const projectSummaries: ProjectSummary[] = projects.map((project) => ({
    ...project,
    latestPipeline: projectData.latestByProject.get(project.id),
  }));

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    projects: projectSummaries,
    pipelines: projectData.pipelines.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    jobs: projectData.jobs,
    runners,
    runnerSource,
    environments: projectData.environments,
    deployments: projectData.deployments,
    activity: projectData.activity.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 30),
    metrics: { ...metrics, averageDurationSeconds: calculateAverageDuration(projectData.pipelines) },
    warnings: mergeWarnings([...warnings, ...projectData.warnings]),
  };
}

function calculateAverageDuration(pipelines: PipelineSummary[]): number {
  if (!pipelines.length) return 0;
  return Math.round(pipelines.reduce((sum, pipeline) => sum + calculateDurationSeconds(pipeline), 0) / pipelines.length);
}
