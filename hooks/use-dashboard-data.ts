"use client";

import { useCallback, useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadPipelinePage,
  loadResources,
  selectDashboardData,
  selectDashboardError,
  selectDashboardLoading,
  selectGroups,
  selectLastRefresh,
  type DashboardFilters,
} from "@/store/dashboard-slice";

export function useDashboardData(filters: DashboardFilters) {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectGroups);
  const stateFilters = useAppSelector((state) => state.dashboard.filters);
  const dataState = useAppSelector((state) => state.dashboard);
  const data = useAppSelector(selectDashboardData);
  const loading = useAppSelector(selectDashboardLoading);
  const error = useAppSelector(selectDashboardError);
  const lastRefresh = useAppSelector(selectLastRefresh);

  const loadData = useCallback(() => {
    void dispatch(loadResources(filters));
  }, [dispatch, filters]);

  const loadPipelines = useCallback(() => {
    void dispatch(loadPipelinePage(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    void dispatch(loadResources(filters));
  }, [dispatch, filters]);

  const hasData = dataState.projects.loaded || dataState.pipelines.loaded || dataState.runners.loaded;
  return { data: hasData ? data : null, groups, loading, error, lastRefresh, loadData, loadPipelines, filters: stateFilters };
}
