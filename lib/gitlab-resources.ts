import { gitlabFetch, gitlabFetchPage, projectPath } from "./gitlab";
import { paginationFromHeaders, type ApiPagination } from "./api-pagination";
import type { GitLabProject, PipelineSummary, RunnerSummary } from "./dashboard";

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

function query(params: Record<string, string | number | undefined>) {
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

export async function listProjects(page: number, perPage: number, lastActivityAfter?: string, search?: string): Promise<PageResult<GitLabProject>> {
  const response = await gitlabFetchPage<GitLabProject[]>(`/projects?${query({ simple: "true", order_by: "last_activity_at", sort: "desc", last_activity_after: lastActivityAfter, search, page, per_page: perPage })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listPipelines(project: GitLabProject, page: number, perPage: number, options: { hours: number; status?: string; ref?: string }): Promise<PageResult<PipelineSummary>> {
  const after = new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString();
  const response = await gitlabFetchPage<GitLabPipeline[]>(`${projectPath(project.id, "/pipelines")}?${query({ updated_after: after, order_by: "updated_at", sort: "desc", status: options.status, ref: options.ref, page, per_page: perPage })}`);
  return { items: response.data.map((pipeline) => formatPipeline(project, pipeline)), pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
}

export async function listRunners(projectId: number | null, page: number, perPage: number): Promise<PageResult<RunnerSummary>> {
  const path = projectId ? `${projectPath(projectId, "/runners")}` : "/runners/all";
  const response = await gitlabFetchPage<GitLabRunner[]>(`${path}?${query({ page, per_page: perPage })}`);
  return { items: response.data, pagination: paginationFromHeaders(response.headers, page, perPage, response.data.length) };
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

export { mapConcurrent };
