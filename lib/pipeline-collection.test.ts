import { describe, expect, it } from "vitest";

import { GitLabApiError } from "./gitlab";
import { collectAllPipelinesForProjects, collectPipelinesForProjects } from "./gitlab-resources";
import type { GitLabProject, PipelineSummary } from "./dashboard";

const project = (id: number, path: string) => ({
  id,
  path_with_namespace: path,
  web_url: `https://gitlab.example.test/${path}`,
}) as GitLabProject;

const pipeline = (projectId: number): PipelineSummary => ({
  id: projectId * 10,
  projectId,
  projectName: `group/project-${projectId}`,
  status: "success",
  ref: "main",
  createdAt: "2026-10-05T10:00:00Z",
  updatedAt: "2026-10-05T10:00:00Z",
  duration: 10,
  queuedDuration: 0,
  webUrl: "https://gitlab.example.test/pipeline",
});

describe("collectPipelinesForProjects", () => {
  it("keeps accessible results when one project denies pipeline access", async () => {
    const result = await collectPipelinesForProjects([project(1, "group/allowed"), project(2, "group/denied")], async (item) => {
      if (item.id === 2) throw new GitLabApiError("forbidden", 403, "/projects/2/pipelines");
      return { items: [pipeline(item.id)], pagination: { page: 1, perPage: 100, total: 1, totalPages: 1, hasNext: false, hasPrevious: false, nextPage: null, previousPage: null } };
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].projectId).toBe(1);
    expect(result.warnings).toEqual(["Pipeline data unavailable for group/denied (GitLab denied access)"]);
    expect(result.stats).toMatchObject({
      totalPipelines: 1,
      successfulPipelines: 1,
      failedPipelines: 0,
      runningPipelines: 0,
      complete: true,
      scope: "recent-project-page",
    });
  });

  it("aggregates every accessible pipeline across the instance project set", async () => {
    const result = await collectAllPipelinesForProjects([project(1, "group/one"), project(2, "group/two")], async (item) =>
      item.id === 1 ? [pipeline(item.id), { ...pipeline(item.id), id: 11, status: "failed" }] : [pipeline(item.id)],
    );

    expect(result.items).toHaveLength(3);
    expect(result.stats).toMatchObject({
      totalPipelines: 3,
      successfulPipelines: 2,
      failedPipelines: 1,
      complete: true,
      scope: "instance",
    });
  });
});
