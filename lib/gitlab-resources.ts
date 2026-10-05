import { GitLabApiError, gitlabFetch, gitlabFetchAll, gitlabFetchPage, projectPath } from "./gitlab";
import { paginationFromHeaders, type ApiPagination } from "./api-pagination";
import type { GitLabProject, GroupSummary, PipelineAggregateStats, PipelineSummary, RunnerAggregateStats, RunnerSummary } from "./dashboard";

type GitLabPipeline = {
  id: number;
  project_id: number;
  iid?: number;
  status: string;
  ref: string;
  sha?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  queued_duration?: number | null;
  web_url?: string;
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

export type PageResult<T> = { items: T[]; pagination: ApiPagination };

function aggregatePipelinePage(result: PageResult<PipelineSummary>, scope: PipelineAggregateStats["scope"]): PipelineAggregateStats {
  const statusCount = (status: string) => result.items.filter((pipeline) => pipeline.status === status).length;
  const successfulPipelines = statusCount("success");
  const failedPipelines = statusCount("failed");
  const canceledPipelines = statusCount("canceled");
  const skippedPipelines = statusCount("skipped");
  const runningPipelines = result.items.filter((pipeline) => ["running", "pending", "created", "waiting_for_resource", "preparing"].includes(pipeline.status)).length;
  const totalPipelines = result.pagination.total ?? result.items.length;
  const completed = successfulPipelines + failedPipelines + canceledPipelines + skippedPipelines;
  return { totalPipelines, successfulPipelines, failedPipelines, runningPipelines, canceledPipelines, skippedPipelines, successRate: completed ? Math.round((successfulPipelines / completed) * 100) : 0, complete: result.pagination.total !== null && result.pagination.total <= result.items.length, scope };
}

function aggregatePipelineItems(items: PipelineSummary[], scope: PipelineAggregateStats["scope"], complete: boolean): PipelineAggregateStats {
  const successfulPipelines = items.filter((pipeline) => pipeline.status === "success").length;
  const failedPipelines = items.filter((pipeline) => pipeline.status === "failed").length;
  const canceledPipelines = items.filter((pipeline) => pipeline.status === "canceled").length;
  const skippedPipelines = items.filter((pipeline) => pipeline.status === "skipped").length;
  const runningPipelines = items.filter((pipeline) => ["running", "pending", "created", "waiting_for_resource", "preparing"].includes(pipeline.status)).length;
  const completed = successfulPipelines + failedPipelines + canceledPipelines + skippedPipelines;
  return { totalPipelines: items.length, successfulPipelines, failedPipelines, runningPipelines, canceledPipelines, skippedPipelines, successRate: completed ? Math.round((successfulPipelines / completed) * 100) : 0, complete, scope };
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) values.set(key, String(value));
  return values.toString();
}

function formatPipeline(project: GitLabProject, pipeline: GitLabPipeline): PipelineSummary {
  return {
    id: pipeline.id,
    projectId: project.id,
    projectName: project.path_with_namespace,
    status: pipeline.status?.toLowerCase() || "unknown",
    ref: pipeline.ref,
    iid: pipeline.iid,
    sha: pipeline.sha,
    source: pipeline.source,
    createdAt: pipeline.created_at,
    updatedAt: pipeline.updated_at,
    startedAt: pipeline.started_at ?? null,
    finishedAt: pipeline.finished_at ?? null,
    duration: pipeline.duration ?? null,
    queuedDuration: pipeline.queued_duration ?? null,
    webUrl: pipeline.web_url || `${project.web_url}/-/pipelines/${pipeline.id}`,
  };
}

export async function getProject(projectId: number): Promise<GitLabProject> {
  return gitlabFetch<GitLabProject>(`/projects/${projectId}?simple=true`);
}

export async function listGroups(page: number, perPage: number, options: { search?: string; topLevelOnly?: boolean; allAvailable?: boolean; visibility?: string; active?: boolean; archived?: boolean; orderBy?: string; sort?: string }): Promise<PageResult<GroupSummary>> {
  const response = await gitlabFetchPage<GroupSummary[]>(`/groups?${query({
    search: options.search,
    top_level_only: options.topLevelOnly,
    all_available: options.allAvailable,
    visibility: options.visibility,
    active: options.active,
    archived: options.archived,
    order_by: options.orderBy || "name",
    sort: options.sort || "asc",
    page,
    per_page: perPage,
  })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listProjects(page: number, perPage: number, lastActivityAfter?: string, search?: string): Promise<PageResult<GitLabProject>> {
  const response = await gitlabFetchPage<GitLabProject[]>(`/projects?${query({ simple: "true", order_by: "last_activity_at", sort: "desc", last_activity_after: lastActivityAfter, search, page, per_page: perPage })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listGroupProjects(groupId: number, page: number, perPage: number, options: { search?: string; includeSubgroups?: boolean }): Promise<PageResult<GitLabProject>> {
  const response = await gitlabFetchPage<GitLabProject[]>(`/groups/${groupId}/projects?${query({ simple: "true", search: options.search, include_subgroups: options.includeSubgroups, order_by: "last_activity_at", sort: "desc", page, per_page: perPage })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listAllProjects(options: { lastActivityAfter?: string; groupId?: number; includeSubgroups?: boolean } = {}): Promise<GitLabProject[]> {
  const path = options.groupId
    ? `/groups/${options.groupId}/projects?${query({ simple: "true", include_subgroups: options.includeSubgroups, order_by: "last_activity_at", sort: "desc" })}`
    : `/projects?${query({ simple: "true", last_activity_after: options.lastActivityAfter, order_by: "last_activity_at", sort: "desc" })}`;
  return gitlabFetchAll<GitLabProject>(path);
}

export async function listPipelines(project: GitLabProject, page: number, perPage: number, options: { hours: number; status?: string; ref?: string; scope?: string }): Promise<PageResult<PipelineSummary>> {
  const after = new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString();
  const response = await gitlabFetchPage<GitLabPipeline[]>(`${projectPath(project.id, "/pipelines")}?${query({ updated_after: after, order_by: "updated_at", sort: "desc", status: options.status, scope: options.scope, ref: options.ref, page, per_page: perPage })}`);
  return { items: response.data.map((pipeline) => formatPipeline(project, pipeline)), pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listAllPipelines(project: GitLabProject, options: { hours: number; status?: string; ref?: string; scope?: string }): Promise<PipelineSummary[]> {
  const after = new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString();
  const pipelines = await gitlabFetchAll<GitLabPipeline>(`${projectPath(project.id, "/pipelines")}?${query({ updated_after: after, order_by: "updated_at", sort: "desc", status: options.status, scope: options.scope, ref: options.ref })}`);
  return pipelines.map((pipeline) => formatPipeline(project, pipeline));
}

export function pipelineStatsForPage(result: PageResult<PipelineSummary>, scope: PipelineAggregateStats["scope"]): PipelineAggregateStats {
  return aggregatePipelinePage(result, scope);
}

export async function pipelineStatsForProject(project: GitLabProject, options: { hours: number; ref?: string }, base: PageResult<PipelineSummary>): Promise<PipelineAggregateStats> {
  const [success, failed, canceled, skipped, running] = await Promise.all([
    listPipelines(project, 1, 1, { ...options, status: "success" }),
    listPipelines(project, 1, 1, { ...options, status: "failed" }),
    listPipelines(project, 1, 1, { ...options, status: "canceled" }),
    listPipelines(project, 1, 1, { ...options, status: "skipped" }),
    listPipelines(project, 1, 1, { ...options, scope: "running" }),
  ]);
  const total = base.pagination.total ?? base.items.length;
  const successfulPipelines = success.pagination.total ?? success.items.length;
  const failedPipelines = failed.pagination.total ?? failed.items.length;
  const canceledPipelines = canceled.pagination.total ?? canceled.items.length;
  const skippedPipelines = skipped.pagination.total ?? skipped.items.length;
  const runningPipelines = running.pagination.total ?? running.items.length;
  const completed = successfulPipelines + failedPipelines + canceledPipelines + skippedPipelines;
  const complete = [base, success, failed, canceled, skipped, running].every((page) => page.pagination.total !== null);
  return { totalPipelines: total, successfulPipelines, failedPipelines, runningPipelines, canceledPipelines, skippedPipelines, successRate: completed ? Math.round((successfulPipelines / completed) * 100) : 0, complete, scope: "project" };
}

export async function listRunners(projectId: number | null, page: number, perPage: number): Promise<PageResult<RunnerSummary>> {
  const path = projectId ? `${projectPath(projectId, "/runners")}` : "/runners/all";
  const response = await gitlabFetchPage<GitLabRunner[]>(`${path}?${query({ page, per_page: perPage })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listAllRunners(): Promise<RunnerSummary[]> {
  return gitlabFetchAll<RunnerSummary>("/runners/all");
}

export async function listAllRunnersForProject(projectId: number): Promise<RunnerSummary[]> {
  return gitlabFetchAll<RunnerSummary>(projectPath(projectId, "/runners"));
}

export function runnerStats(items: RunnerSummary[], scope: RunnerAggregateStats["scope"] = "instance", complete = true): RunnerAggregateStats {
  const onlineRunners = items.filter((runner) => !runner.paused && (runner.online || runner.status === "online")).length;
  const pausedRunners = items.filter((runner) => runner.paused).length;
  return { totalRunners: items.length, onlineRunners, offlineRunners: Math.max(items.length - onlineRunners, 0), pausedRunners, complete, scope };
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function collectPipelinesForProjects(
  projects: GitLabProject[],
  loader: (project: GitLabProject) => Promise<PageResult<PipelineSummary>>,
): Promise<{ items: PipelineSummary[]; stats: PipelineAggregateStats; warnings: string[] }> {
  const results = await mapConcurrent(projects, 4, async (project) => {
    try {
      return { result: await loader(project) };
    } catch (error) {
      const reason = error instanceof GitLabApiError && error.status === 403
        ? "GitLab denied access"
        : error instanceof GitLabApiError && error.status === 404
          ? "project or pipeline endpoint was not found"
          : "GitLab request failed";
      return { warning: `Pipeline data unavailable for ${project.path_with_namespace} (${reason})` };
    }
  });

  const pages = results.flatMap((entry) => entry.result ? [entry.result] : []);
  const items = pages.flatMap((page) => page.items);
  const stats = pages.reduce<PipelineAggregateStats>((total, page) => {
    const current = aggregatePipelinePage(page, "recent-project-page");
    total.totalPipelines += current.totalPipelines;
    total.successfulPipelines += current.successfulPipelines;
    total.failedPipelines += current.failedPipelines;
    total.runningPipelines += current.runningPipelines;
    total.canceledPipelines += current.canceledPipelines;
    total.skippedPipelines += current.skippedPipelines;
    total.complete = total.complete && current.complete;
    return total;
  }, { totalPipelines: 0, successfulPipelines: 0, failedPipelines: 0, runningPipelines: 0, canceledPipelines: 0, skippedPipelines: 0, successRate: 0, complete: true, scope: "recent-project-page" });
  const completed = stats.successfulPipelines + stats.failedPipelines + stats.canceledPipelines + stats.skippedPipelines;
  stats.successRate = completed ? Math.round((stats.successfulPipelines / completed) * 100) : 0;
  return {
    items,
    stats,
    warnings: results.flatMap((entry) => entry.warning ? [entry.warning] : []),
  };
}

export async function collectAllPipelinesForProjects(
  projects: GitLabProject[],
  loader: (project: GitLabProject) => Promise<PipelineSummary[]>,
): Promise<{ items: PipelineSummary[]; stats: PipelineAggregateStats; warnings: string[] }> {
  const results = await mapConcurrent(projects, 6, async (project) => {
    try {
      return { items: await loader(project) };
    } catch (error) {
      const reason = error instanceof GitLabApiError && error.status === 403
        ? "GitLab denied access"
        : error instanceof GitLabApiError && error.status === 404
          ? "project or pipeline endpoint was not found"
          : "GitLab request failed";
      return { items: [] as PipelineSummary[], warning: `Pipeline data unavailable for ${project.path_with_namespace} (${reason})` };
    }
  });
  const items = results.flatMap((entry) => entry.items);
  return {
    items,
    stats: aggregatePipelineItems(items, "instance", results.every((entry) => !entry.warning)),
    warnings: results.flatMap((entry) => entry.warning ? [entry.warning] : []),
  };
}

export { mapConcurrent };
