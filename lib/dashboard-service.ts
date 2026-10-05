import { paginateItems, type ApiPagination } from "./api-pagination";
import {
  getGroup,
  getProject,
  instancePipelineAnalytics,
  listAllRunners,
  listGlobalPipelinesPage,
  listGroupProjects,
  listGroups,
  listPipelines,
  listProjects,
  pipelineAnalytics,
  pipelineStatsForItems,
  runnerStats,
  type PageResult,
  collectPipelinesForProjects,
} from "./gitlab-resources";
import {
  buildPipelineMetrics,
  mergeWarnings,
  type DashboardMetrics,
  type DashboardSnapshot,
  type GitLabProject,
  type GroupSummary,
  type JobSummary,
  type PipelineAggregateStats,
  type PipelineSummary,
  type RunnerAggregateStats,
  type RunnerSummary,
} from "./dashboard";
import { GitLabApiError } from "./gitlab";
import { cached } from "./ttl-cache";

const PROJECT_PAGE_SIZE = 100;
const GROUP_PAGE_SIZE = 100;
const PIPELINE_PAGE_SIZE = 20;
const RUNNER_PAGE_SIZE = 100;

type DashboardOptions = {
  hours: number;
  projectId?: number;
  groupId?: number;
  includeSubgroups?: boolean;
};

function emptyPagination(perPage: number): ApiPagination {
  return { page: 1, perPage, total: 0, totalPages: 0, hasNext: false, hasPrevious: false, nextPage: null, previousPage: null };
}

function latestPipelinesByProject(projects: GitLabProject[], pipelines: PipelineSummary[]) {
  const latestByProject = new Map<number, PipelineSummary>();
  for (const pipeline of pipelines) if (!latestByProject.has(pipeline.projectId)) latestByProject.set(pipeline.projectId, pipeline);
  return projects.map((project) => ({ ...project, latestPipeline: latestByProject.get(project.id) }));
}

export function dashboardMetricsFromStats(
  pipelineStats: PipelineAggregateStats,
  runnerStatsValue: RunnerAggregateStats | null,
  pipelines: PipelineSummary[],
  jobs: JobSummary[],
): DashboardMetrics {
  const metrics = buildPipelineMetrics(pipelines, jobs);
  metrics.totalPipelines = pipelineStats.totalPipelines;
  metrics.successfulPipelines = pipelineStats.successfulPipelines;
  metrics.failedPipelines = pipelineStats.failedPipelines;
  metrics.runningPipelines = pipelineStats.runningPipelines;
  metrics.successRate = pipelineStats.successRate;
  metrics.visibleRunners = runnerStatsValue?.onlineRunners ?? 0;
  return metrics;
}

function fallbackPipelineStats(page: PageResult<PipelineSummary>): PipelineAggregateStats {
  return pipelineStatsForItems(page.items, "authenticated-user", false);
}

async function loadProjects(options: DashboardOptions): Promise<{ page: PageResult<GitLabProject>; warnings: string[] }> {
  try {
    const page = options.groupId
      ? await listGroupProjects(options.groupId, 1, PROJECT_PAGE_SIZE, { includeSubgroups: options.includeSubgroups })
      : await listProjects(1, PROJECT_PAGE_SIZE);
    return { page, warnings: [] };
  } catch (error) {
    return { page: { items: [], pagination: emptyPagination(PROJECT_PAGE_SIZE) }, warnings: [error instanceof GitLabApiError && error.status === 403 ? "Project inventory is not available to this GitLab token" : "Project inventory could not be loaded"] };
  }
}

async function loadGroups(): Promise<{ page: PageResult<GroupSummary>; warnings: string[] }> {
  try {
    return { page: await listGroups(1, GROUP_PAGE_SIZE, { allAvailable: true }), warnings: [] };
  } catch (error) {
    return { page: { items: [], pagination: emptyPagination(GROUP_PAGE_SIZE) }, warnings: [error instanceof GitLabApiError && error.status === 403 ? "Group inventory is not available to this GitLab token" : "Group inventory could not be loaded"] };
  }
}

async function loadRunners(): Promise<{ items: RunnerSummary[]; page: ApiPagination; stats: RunnerAggregateStats | null; warnings: string[] }> {
  try {
    const items = await cached("runners:instance", listAllRunners);
    const result = paginateItems(items, 1, RUNNER_PAGE_SIZE);
    return { items: result.items, page: result.pagination, stats: runnerStats(items), warnings: [] };
  } catch (error) {
    return { items: [], page: emptyPagination(RUNNER_PAGE_SIZE), stats: null, warnings: [error instanceof GitLabApiError && error.status === 403 ? "Full runner inventory is unavailable to this GitLab token" : "Runner inventory could not be loaded"] };
  }
}

async function loadPipelines(options: DashboardOptions, projects: GitLabProject[]): Promise<{ page: PageResult<PipelineSummary>; warnings: string[] }> {
  try {
    if (options.groupId && !options.projectId) {
      const collected = await collectPipelinesForProjects(projects, (project) => listPipelines(project, 1, 1, { hours: options.hours }));
      const sorted = collected.items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      const page = paginateItems(sorted, 1, PIPELINE_PAGE_SIZE);
      return { page, warnings: collected.warnings };
    }
    const page = await listGlobalPipelinesPage(1, PIPELINE_PAGE_SIZE, { hours: options.hours, projectId: options.projectId });
    return { page, warnings: [] };
  } catch (error) {
    const warning = error instanceof GitLabApiError && [403, 404, 405].includes(error.status)
      ? "GitLab global pipeline listing is unavailable; dashboard metrics can still use Enterprise pipeline analytics."
      : "Latest pipeline rows could not be loaded";
    return { page: { items: [], pagination: emptyPagination(PIPELINE_PAGE_SIZE) }, warnings: [warning] };
  }
}

async function loadPipelineStats(options: DashboardOptions, pipelinePage: PageResult<PipelineSummary>): Promise<{ stats: PipelineAggregateStats; warnings: string[] }> {
  try {
    if (options.projectId) {
      const project = await getProject(options.projectId);
      return { stats: await cached(`pipeline-analytics:project:${project.path_with_namespace}:${options.hours}`, () => pipelineAnalytics({ hours: options.hours, project: project.path_with_namespace })), warnings: [] };
    }
    if (options.groupId) {
      const group = await getGroup(options.groupId);
      return { stats: await cached(`pipeline-analytics:group:${group.full_path}:${options.hours}`, () => pipelineAnalytics({ hours: options.hours, group: group.full_path })), warnings: [] };
    }
    return { stats: await cached(`pipeline-analytics:instance:${options.hours}`, () => instancePipelineAnalytics({ hours: options.hours })), warnings: [] };
  } catch (error) {
    const message = error instanceof GitLabApiError && error.status === 403
      ? "Enterprise pipeline analytics is not available to this GitLab token"
      : "Enterprise pipeline analytics is unavailable; pipeline cards use only visible rows";
    return { stats: fallbackPipelineStats(pipelinePage), warnings: [message] };
  }
}

export async function getDashboardSnapshot(options: DashboardOptions): Promise<DashboardSnapshot> {
  const [projectResult, groupResult, runnerResult] = await Promise.all([
    loadProjects(options),
    loadGroups(),
    loadRunners(),
  ]);
  const pipelineResult = await loadPipelines(options, projectResult.page.items);
  const statsResult = await loadPipelineStats(options, pipelineResult.page);
  const jobs: JobSummary[] = [];
  const metrics = dashboardMetricsFromStats(statsResult.stats, runnerResult.stats, pipelineResult.page.items, jobs);
  const warnings = mergeWarnings([...projectResult.warnings, ...groupResult.warnings, ...runnerResult.warnings, ...pipelineResult.warnings, ...statsResult.warnings]);
  const projects = latestPipelinesByProject(projectResult.page.items, pipelineResult.page.items);
  return {
    generatedAt: new Date().toISOString(),
    windowHours: options.hours,
    projectCount: projectResult.page.pagination.total ?? projects.length,
    runnerCount: runnerResult.stats?.totalRunners ?? runnerResult.items.length,
    projects,
    pipelines: pipelineResult.page.items,
    pipelineStats: statsResult.stats,
    runnerStats: runnerResult.stats || undefined,
    jobs,
    runners: runnerResult.items,
    runnerSource: runnerResult.stats ? "inventory" : "unavailable",
    metrics,
    warnings,
    groups: groupResult.page.items,
    pagination: {
      groups: groupResult.page.pagination,
      projects: projectResult.page.pagination,
      pipelines: pipelineResult.page.pagination,
      runners: runnerResult.page,
    },
  };
}
