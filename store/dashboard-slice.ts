import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  buildPipelineMetrics,
  mergeWarnings,
  type DashboardData,
  type GitLabProject,
  type GroupSummary,
  type PipelineAggregateStats,
  type PipelineSummary,
  type RunnerAggregateStats,
  type RunnerSummary,
} from "@/lib/dashboard";
import type { ApiPagination } from "@/lib/api-pagination";

export type DashboardFilters = {
  groupId: number | null;
  projectId: number | null;
  includeSubgroups: boolean;
  hours: number;
};

export type ResourcePage<T> = {
  items: T[];
  pagination: ApiPagination | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

type ApiPage<T> = {
  items: T[];
  pagination: ApiPagination;
  stats?: PipelineAggregateStats;
  runnerStats?: RunnerAggregateStats;
  warnings?: string[];
  error?: string;
};

export type DashboardState = {
  filters: DashboardFilters;
  groups: ResourcePage<GroupSummary>;
  projects: ResourcePage<GitLabProject>;
  pipelines: ResourcePage<PipelineSummary>;
  pipelineStats: PipelineAggregateStats | null;
  runnerStats: RunnerAggregateStats | null;
  runners: ResourcePage<RunnerSummary>;
  runnerSource: "inventory" | "unavailable";
  warnings: string[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastRefresh: string | null;
};

const emptyPage = <T>(): ResourcePage<T> => ({ items: [], pagination: null, loading: false, loaded: false, error: null });

const initialState: DashboardState = {
  filters: { groupId: null, projectId: null, includeSubgroups: true, hours: 24 },
  groups: emptyPage<GroupSummary>(),
  projects: emptyPage<GitLabProject>(),
  pipelines: emptyPage<PipelineSummary>(),
  pipelineStats: null,
  runnerStats: null,
  runners: emptyPage<RunnerSummary>(),
  runnerSource: "unavailable",
  warnings: [],
  status: "idle",
  error: null,
  lastRefresh: null,
};

async function fetchPage<T>(url: string): Promise<ApiPage<T>> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as ApiPage<T>;
  if (!response.ok) throw new Error(payload.error || "GitLab resource request failed");
  return payload;
}

async function loadResource<T>(url: string, label: string) {
  try {
    const page = await fetchPage<T>(url);
    return { page, warnings: page.warnings || [] };
  } catch (error) {
    return { page: null, warnings: [error instanceof Error ? `${label}: ${error.message}` : `${label}: request failed`] };
  }
}

export const loadGroups = createAsyncThunk("dashboard/loadGroups", async () => loadResource<GroupSummary>("/api/groups?page=1&per_page=100", "Groups"));

export const loadResources = createAsyncThunk("dashboard/loadResources", async (filters: DashboardFilters) => {
  const projectParams = new URLSearchParams({ page: "1", per_page: "100", all: "true" });
  if (filters.groupId) {
    projectParams.set("group_id", String(filters.groupId));
    projectParams.set("include_subgroups", String(filters.includeSubgroups));
  }
  const pipelineParams = new URLSearchParams({ project: filters.projectId ? String(filters.projectId) : "all", page: "1", per_page: "100", all: "true", hours: String(filters.hours) });
  if (filters.groupId) {
    pipelineParams.set("group_id", String(filters.groupId));
    pipelineParams.set("include_subgroups", String(filters.includeSubgroups));
  }
  const runnerParams = new URLSearchParams({ project: filters.projectId ? String(filters.projectId) : "all", page: "1", per_page: "100", all: "true" });
  const [projects, pipelines, runners] = await Promise.all([
    loadResource<GitLabProject>(`/api/projects?${projectParams}`, "Projects"),
    loadResource<PipelineSummary>(`/api/pipelines?${pipelineParams}`, "Pipelines"),
    loadResource<RunnerSummary>(`/api/runners?${runnerParams}`, "Runners"),
  ]);
  return { filters, projects, pipelines, runners, warnings: [...projects.warnings, ...pipelines.warnings, ...runners.warnings] };
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<DashboardFilters>) {
      state.filters = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadGroups.pending, (state) => {
        state.groups.loading = true;
        state.groups.error = null;
      })
      .addCase(loadGroups.fulfilled, (state, action) => {
        state.groups = { items: action.payload.page?.items || [], pagination: action.payload.page?.pagination || null, loading: false, loaded: true, error: null };
        state.warnings = mergeWarnings([...state.warnings, ...action.payload.warnings]);
      })
      .addCase(loadGroups.rejected, (state, action) => {
        state.groups.loading = false;
        state.groups.loaded = true;
        state.groups.error = action.error.message || "Groups could not be loaded";
      })
      .addCase(loadResources.pending, (state, action) => {
        state.status = "loading";
        state.filters = action.meta.arg;
        state.error = null;
        state.projects.loading = true;
        state.pipelines.loading = true;
        state.runners.loading = true;
      })
      .addCase(loadResources.fulfilled, (state, action) => {
        const { projects, pipelines, runners } = action.payload;
        state.status = "succeeded";
        state.lastRefresh = new Date().toISOString();
        state.warnings = mergeWarnings(action.payload.warnings);
        state.projects = { items: projects.page?.items || [], pagination: projects.page?.pagination || null, loading: false, loaded: true, error: projects.page ? null : projects.warnings[0] || null };
        state.pipelines = { items: pipelines.page?.items || [], pagination: pipelines.page?.pagination || null, loading: false, loaded: true, error: pipelines.page ? null : pipelines.warnings[0] || null };
        state.pipelineStats = pipelines.page?.stats || null;
        state.runnerStats = runners.page?.runnerStats || null;
        state.runners = { items: runners.page?.items || [], pagination: runners.page?.pagination || null, loading: false, loaded: true, error: runners.page ? null : runners.warnings[0] || null };
        state.runnerSource = runners.page ? "inventory" : "unavailable";
      })
      .addCase(loadResources.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Dashboard data could not be loaded";
        state.projects.loading = false;
        state.pipelines.loading = false;
        state.runners.loading = false;
      });
  },
});

export const { setFilters, clearError } = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;

const selectDashboardState = (state: { dashboard: DashboardState }) => state.dashboard;
export const selectGroups = createSelector(selectDashboardState, (state) => state.groups);
export const selectFilters = createSelector(selectDashboardState, (state) => state.filters);

export const selectDashboardData = createSelector(selectDashboardState, (state): DashboardData => {
  const latestByProject = new Map<number, PipelineSummary>();
  for (const pipeline of state.pipelines.items) {
    if (!latestByProject.has(pipeline.projectId)) latestByProject.set(pipeline.projectId, pipeline);
  }
  const projects = state.projects.items.map((project) => ({ ...project, latestPipeline: latestByProject.get(project.id) }));
  const metrics = buildPipelineMetrics(state.pipelines.items);
  if (state.pipelineStats) {
    metrics.totalPipelines = state.pipelineStats.totalPipelines;
    metrics.successfulPipelines = state.pipelineStats.successfulPipelines;
    metrics.failedPipelines = state.pipelineStats.failedPipelines;
    metrics.runningPipelines = state.pipelineStats.runningPipelines;
    metrics.successRate = state.pipelineStats.successRate;
  }
  metrics.visibleRunners = state.runners.items.filter((runner) => runner.online && !runner.paused).length;
  if (state.runnerStats) metrics.visibleRunners = state.runnerStats.onlineRunners;
  return {
    generatedAt: state.lastRefresh || new Date(0).toISOString(),
    windowHours: state.filters.hours,
    projectCount: state.projects.pagination?.total ?? projects.length,
    runnerCount: state.runners.pagination?.total ?? state.runners.items.length,
    projects,
    pipelines: state.pipelines.items,
    pipelineStats: state.pipelineStats || undefined,
    runnerStats: state.runnerStats || undefined,
    jobs: [],
    runners: state.runners.items,
    runnerSource: state.runnerSource,
    metrics,
    warnings: state.warnings,
  };
});

export const selectDashboardLoading = createSelector(selectDashboardState, (state) => state.status === "loading" || state.groups.loading);
export const selectDashboardError = createSelector(selectDashboardState, (state) => state.error);
export const selectLastRefresh = createSelector(selectDashboardState, (state) => state.lastRefresh);
