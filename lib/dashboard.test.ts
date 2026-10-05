import { describe, expect, it } from "vitest";

import {
  buildPipelineMetrics,
  calculateDurationSeconds,
  mergeWarnings,
  type PipelineSummary,
} from "./dashboard";
import { explainFailureReason, summarizePipelineStats, summarizeJobAttempts } from "./pipeline-detail";
import { paginateItems, paginationFromHeaders } from "./api-pagination";

const pipelines: PipelineSummary[] = [
  {
    id: 1,
    projectId: 10,
    projectName: "api",
    status: "success",
    ref: "main",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:02:00Z",
    duration: 120,
    queuedDuration: 10,
    webUrl: "https://gitlab.example.com/api/-/pipelines/1",
  },
  {
    id: 2,
    projectId: 11,
    projectName: "web",
    status: "failed",
    ref: "main",
    createdAt: "2026-10-01T11:00:00Z",
    updatedAt: "2026-10-01T11:01:30Z",
    duration: null,
    queuedDuration: null,
    webUrl: "https://gitlab.example.com/web/-/pipelines/2",
  },
];

describe("calculateDurationSeconds", () => {
  it("uses the API duration when available", () => {
    expect(calculateDurationSeconds(pipelines[0])).toBe(120);
  });

  it("falls back to timestamps and never returns a negative value", () => {
    expect(calculateDurationSeconds(pipelines[1])).toBe(90);
    expect(
      calculateDurationSeconds({
        ...pipelines[1],
        createdAt: "2026-10-01T11:02:00Z",
        updatedAt: "2026-10-01T11:01:30Z",
      }),
    ).toBe(0);
  });
});

describe("buildPipelineMetrics", () => {
  it("counts statuses and calculates success rate from completed pipelines", () => {
    expect(buildPipelineMetrics(pipelines)).toMatchObject({
      totalPipelines: 2,
      successfulPipelines: 1,
      failedPipelines: 1,
      successRate: 50,
      averageDurationSeconds: 105,
    });
  });

  it("counts failed job reasons and stages", () => {
    expect(buildPipelineMetrics(pipelines, [
      { id: 10, name: "unit_tests", stage: "test", status: "failed", failure_reason: "script_failure", projectId: 10, projectName: "api" },
      { id: 11, name: "package", stage: "package", status: "failed", failure_reason: "runner_system_failure", projectId: 10, projectName: "api" },
    ])).toMatchObject({
      failureReasons: [{ name: "runner_system_failure", count: 1 }, { name: "script_failure", count: 1 }],
      failedStages: [{ name: "package", count: 1 }, { name: "test", count: 1 }],
    });
  });
});

describe("mergeWarnings", () => {
  it("deduplicates empty and repeated warnings", () => {
    expect(mergeWarnings(["Runner access unavailable", "", "Runner access unavailable"])).toEqual([
      "Runner access unavailable",
    ]);
  });
});

describe("API pagination", () => {
  it("preserves GitLab totals, including an empty result", () => {
    const headers = new Headers({ "x-total": "0", "x-total-pages": "0" });
    expect(paginationFromHeaders(headers, 1, 20, 0)).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it("uses GitLab next and previous page headers", () => {
    const headers = new Headers({ "x-total": "41", "x-total-pages": "3", "x-next-page": "3", "x-prev-page": "1" });
    expect(paginationFromHeaders(headers, 2, 20, 20)).toMatchObject({
      total: 41,
      totalPages: 3,
      nextPage: 3,
      previousPage: 1,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it("paginates an aggregated resource without confusing it with its source project pages", () => {
    const result = paginateItems(Array.from({ length: 217 }, (_, index) => index + 1), 2, 100);
    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe(101);
    expect(result.pagination).toMatchObject({ total: 217, totalPages: 3, nextPage: 3, previousPage: 1 });
  });
});

describe("pipeline diagnostics", () => {
  const jobs = [
    {
      id: 20,
      name: "unit_tests",
      stage: "test",
      status: "failed",
      failure_reason: "script_failure",
      duration: 12,
      created_at: "2026-10-01T10:00:00Z",
      artifacts: [{ file_type: "trace", filename: "job.log", size: 128 }],
      runner: null,
      projectId: 1,
      projectName: "engineering/platform",
    },
    {
      id: 21,
      name: "unit_tests",
      stage: "test",
      status: "success",
      failure_reason: null,
      duration: 8,
      created_at: "2026-10-01T10:02:00Z",
      artifacts: [],
      runner: null,
      projectId: 1,
      projectName: "engineering/platform",
    },
    {
      id: 22,
      name: "package",
      stage: "package",
      status: "skipped",
      failure_reason: null,
      duration: null,
      created_at: "2026-10-01T10:03:00Z",
      artifacts: [],
      runner: null,
      projectId: 1,
      projectName: "engineering/platform",
    },
  ];

  it("marks retry attempts and counts retries per job name and stage", () => {
    expect(summarizeJobAttempts(jobs).slice(0, 2)).toMatchObject([
      { id: 20, attempt: 1, retryCount: 1, isRetry: false },
      { id: 21, attempt: 2, retryCount: 1, isRetry: true },
    ]);
  });

  it("summarizes failure reasons, stages, artifacts, and job outcomes", () => {
    expect(summarizePipelineStats(summarizeJobAttempts(jobs))).toMatchObject({
      totalJobs: 3,
      failedJobs: 1,
      successfulJobs: 1,
      skippedJobs: 1,
      retries: 1,
      artifactCount: 1,
      artifactBytes: 128,
      failureReasons: ["script_failure"],
      failedStages: ["test"],
    });
  });

  it("turns GitLab failure reasons into operator-readable explanations", () => {
    expect(explainFailureReason("script_failure")).toBe("The job script returned a non-zero exit code.");
    expect(explainFailureReason("runner_system_failure")).toBe("The runner failed while preparing or executing the job.");
  });
});
