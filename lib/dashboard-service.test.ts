import { describe, expect, it } from "vitest";

import { dashboardMetricsFromStats } from "./dashboard-service";
import type { PipelineAggregateStats, PipelineSummary, RunnerAggregateStats } from "./dashboard";

const pipeline: PipelineSummary = {
  id: 1,
  projectId: 10,
  projectName: "group/project",
  status: "success",
  ref: "main",
  createdAt: "2026-10-05T10:00:00Z",
  updatedAt: "2026-10-05T10:00:00Z",
  duration: 10,
  queuedDuration: 0,
  webUrl: "https://gitlab.example.test/group/project/-/pipelines/1",
};

describe("dashboardMetricsFromStats", () => {
  it("uses aggregate pipeline totals instead of the visible page", () => {
    const pipelineStats: PipelineAggregateStats = {
      totalPipelines: 217,
      successfulPipelines: 190,
      failedPipelines: 17,
      runningPipelines: 10,
      canceledPipelines: 0,
      skippedPipelines: 0,
      successRate: 92,
      complete: true,
      scope: "instance",
    };
    const runnerStats: RunnerAggregateStats = {
      totalRunners: 12,
      onlineRunners: 9,
      offlineRunners: 3,
      pausedRunners: 1,
      complete: true,
      scope: "instance",
    };

    expect(dashboardMetricsFromStats(pipelineStats, runnerStats, [pipeline], [])).toMatchObject({
      totalPipelines: 217,
      successfulPipelines: 190,
      failedPipelines: 17,
      runningPipelines: 10,
      successRate: 92,
      visibleRunners: 9,
    });
  });
});
