import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  buildPipelineMetrics,
  mergeWarnings,
  type DashboardSnapshot,
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

async function fetchDashboard(url: string): Promise<DashboardSnapshot> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as DashboardSnapshot & { error?: string };
  if (!response.ok) throw new Error(payload.error || "GitLab resource request failed");
  return payload;
}

async function loadDashboard(url: string) {
  try {
    const dashboard = await fetchDashboard(url);
    return { dashboard, warnings: dashboard.warnings || [] };
  } catch (error) {
    return { dashboard: null, warnings: [error instanceof Error ? `Dashboard: ${error.message}` : "Dashboard: request failed"] };
  }
}

export const loadResources = createAsyncThunk("dashboard/loadResources", async (filters: DashboardFilters) => {
  const params = new URLSearchParams({ hours: String(filters.hours) });
  if (filters.projectId) params.set("project", String(filters.projectId));
  if (filters.groupId) {
    params.set("group_id", String(filters.groupId));
    params.set("include_subgroups", String(filters.includeSubgroups));
  }
  const result = await loadDashboard(`/api/dashboard?${params}`);
  return { filters, dashboard: result.dashboard, warnings: result.warnings };
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
      .addCase(loadResources.pending, (state, action) => {
        state.status = "loading";
        state.filters = action.meta.arg;
        state.error = null;
        state.projects.loading = true;
        state.pipelines.loading = true;
        state.runners.loading = true;
        state.groups.loading = true;
      })
      .addCase(loadResources.fulfilled, (state, action) => {
        const dashboard = action.payload.dashboard;
        state.status = "succeeded";
        state.lastRefresh = new Date().toISOString();
        state.warnings = mergeWarnings(action.payload.warnings);
        state.groups = { items: dashboard?.groups || [], pagination: dashboard?.pagination.groups || null, loading: false, loaded: true, error: null };
        state.projects = { items: dashboard?.projects || [], pagination: dashboard?.pagination.projects || null, loading: false, loaded: true, error: null };
        state.pipelines = { items: dashboard?.pipelines || [], pagination: dashboard?.pagination.pipelines || null, loading: false, loaded: true, error: null };
        state.pipelineStats = dashboard?.pipelineStats || null;
        state.runnerStats = dashboard?.runnerStats || null;
        state.runners = { items: dashboard?.runners || [], pagination: dashboard?.pagination.runners || null, loading: false, loaded: true, error: null };
        state.runnerSource = dashboard?.runnerSource || "unavailable";
      })
      .addCase(loadResources.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Dashboard data could not be loaded";
        state.projects.loading = false;
        state.pipelines.loading = false;
        state.runners.loading = false;
        state.groups.loading = false;
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
